import FuzzySet from 'fuzzyset.js';
import debounce from 'lodash.debounce';
import { h } from './utils';
import getSuggestBlot from './suggestBlot';
import { debounceTime } from '../node_modules/rxjs/operator/debounceTime';

export default (Quill) => {
  const Delta = Quill.import('delta');

  Quill.register('formats/suggest', getSuggestBlot(Quill));

  /**
 * Quill Autocomplete for placeholder module
 * @export
 * @class AutoComplete
 */
  class AutoComplete {
    /**
     * Creates an instance of AutoComplete.
     * @param {any} quill the Quill instance
     * @param {Object} options module options
     * @memberof AutoComplete
     */
    constructor(quill, {
      onOpen,
      onClose,
      getPlaceholders,
      fetchPlaceholders,
      onFetchStarted,
      onFetchFinished,
      container,
      debounceTime = 0
    }) {
      const bindedUpdateFn = this.update.bind(this);

      this.quill = quill;
      this.onClose = onClose;
      this.onOpen = onOpen;
      this.onFetchStarted = onFetchStarted;
      this.onFetchFinished = onFetchFinished;
      this.getPlaceholders = getPlaceholders;
      this.fetchPlaceholders = fetchPlaceholders;
      if (typeof container === 'string') {
        this.container = this.quill.container.parentNode.querySelector(container);
      } else if (container === undefined) {
        this.container = h('ul', {});
        this.quill.container.parentNode.appendChild(this.container);
      } else {
        this.container = container;
      }
      this.container.classList.add('ql-autocomplete-menu', 'completions');
      this.container.style.position = 'absolute';
      this.container.style.display = 'none';
      // prepare handlers and bind/unbind them when appropriate
      this.onSelectionChange = this.maybeUnfocus.bind(this);
      this.onTextChange = debounceTime
        ? debounce(bindedUpdateFn, debounceTime) : bindedUpdateFn;

      this.open = false;
      this.quill.suggestsDialogOpen = false;
      this.hashIndex = null;
      this.focusedButton = null;
      this.buttons = [];
      this.matchedPlaceholders = [];
      this.toolbarHeight = 0;

      this.suggestKeydownHandler = function(event) {
        if (event.key === 'Enter')
          this.handleEnterTab();
      }.bind(this);

      // TODO: Once Quill supports using event.key (issue #1091) use that instead of alt-3
      // quill.keyboard.addBinding({
      //   key: 51,  // '3' keyCode
      //   altKey: true,
      //   ctrlKey: null // both
      // }, this.onHashKey.bind(this));

      quill.root.addEventListener('keydown', (event) => {
        if (event.defaultPrevented)
          return; // Do nothing if the event was already processed

        if (event.key === '#') {
          if (!this.toolbarHeight)
            this.toolbarHeight = this.quill.getModule('toolbar').container.offsetHeight;
          this.onHashKey(this.quill.getSelection());
        } else
          return; // Quit when this doesn't handle the key event.

        // Cancel the default action to avoid it being handled twice
        event.preventDefault();
      }, true);

      quill.keyboard.addBinding({
        key: 40,  // ArrowDown
        collapsed: true,
        format: [ 'suggest' ]
      }, this.handleArrow.bind(this));

      quill.keyboard.addBinding({
        key: 27,  // Escape
        collapsed: null,
        format: [ 'suggest' ]
      }, this.handleEscape.bind(this));

      quill.suggestHandler = this.onHashKey.bind(this);
    }

    /**
     * Called when user entered `#`
     * prepare editor and open completions list
     * @param {Quill.RangeStatic} range concerned region
     * @returns {Boolean} can stop event propagation
     * @memberof AutoComplete
     */
    onHashKey(range) {
      // prevent from opening twice
      // NOTE: returning true stops event propagation in Quill
      if (this.open)
        return true;

      if (range.length > 0) {
        this.quill.deleteText(range.index, range.length, Quill.sources.USER);
      }
      // insert a temporary SuggestBlot
      this.quill.insertText(range.index, '#', 'suggest', '@@placeholder', Quill.sources.USER);
      const hashSignBounds = this.quill.getBounds(range.index);
      const rest = this.toolbarHeight + 2;
      this.quill.setSelection(range.index + 1, Quill.sources.SILENT);

      this.hashIndex = range.index;
      this.container.style.left = hashSignBounds.left + 'px';
      this.container.style.top = hashSignBounds.top + hashSignBounds.height + rest + 'px';
      this.open = true;
      this.quill.suggestsDialogOpen = true;
      // binding completions event handler to handle user query
      this.quill.on('text-change', this.onTextChange);
      // binding event handler to handle user want to quit autocompletions
      this.quill.once('selection-change', this.onSelectionChange);
      // binding handler to react when user pressed Enter
      // when autocomplete UI is in default state
      this.quill.root.addEventListener('keydown', this.suggestKeydownHandler);
      this.update();
      this.onOpen && this.onOpen();
    }

    /**
     * Called on first user interaction
     * with completions list on open
     * @returns {Boolean} eventually stop propagation
     * @memberof AutoComplete
     */
    handleArrow() {
      if (!this.open)
        return true;
      this.buttons[0].focus();
    }

    /**
     * Called on first user interaction
     * with completions list on open
     * @returns {Boolean} eventually stop propagation
     * @memberof AutoComplete
     */
    handleEnterTab() {
      if (!this.open)
        return true;
      this.close(this.matchedPlaceholders[0]);
    }

    /**
     * Called on first user interaction
     * with completions list on open
     * @returns {Boolean} eventually stop propagation
     * @memberof AutoComplete
     */
    handleEscape() {
      if (!this.open)
        return true;
      this.close();
    }

    emptyCompletionsContainer() {
      // empty container completely
      while (this.container.firstChild)
        this.container.removeChild(this.container.firstChild);
    }

    /**
     * Completions updater
     * analyze user query && update list and DOM
     * @returns {any} eventually close list and quit function
     * @memberof AutoComplete
     */
    async update() {
      const sel = this.quill.getSelection().index;
      const placeholders = this.getPlaceholders();
      const labels = placeholders.map(({ label }) => label.toLowerCase());
      const fs = FuzzySet(labels, false);
      let labelResults = null;
      // user deleted the '#' character
      if (this.hashIndex >= sel) {
        return this.close(null);
      }
      this.originalQuery = this.quill.getText(this.hashIndex + 1, sel - this.hashIndex - 1);
      this.query = this.originalQuery.toLowerCase();
      if (this.query.length) {
        // handle promise fetching custom placeholders
        if (this.fetchPlaceholders && this.query.length > 4) {
          this.onFetchStarted && this.onFetchStarted(this.query);
          const results = await this.fetchPlaceholders(this.query);
          this.onFetchFinished && this.onFetchFinished(results);

          if(results && results.length)
            results.forEach((ph) => {
              const notExisting = labels.indexOf(ph.label) === -1;

              if (notExisting) {
                fs.add(ph.label);
                placeholders.push(ph);
                labels.push(ph.label);
              }
            });
        }
        labelResults = fs.get(this.query);
      }
      labelResults = labelResults
          ? labelResults.map(([ , label ]) => label)
          : labels;
      this.matchedPlaceholders = placeholders
        .filter(({ label }) => labelResults.indexOf(label) !== -1);
      this.renderCompletions(this.matchedPlaceholders);
    }

    /**
     * Called when user go somewhere else
     * than completion list => user changed focus
     * @memberof AutoComplete
     */
    maybeUnfocus() {
      if (this.container.querySelector('*:focus'))
        return;
      this.close(null);
    }

    /**
     * Render completions List
     * @param {Array} placeholders list of placeholders to propose
     * @memberof AutoComplete
     */
    renderCompletions(placeholders) {
      this.emptyCompletionsContainer();

      const buttons = Array(placeholders.length);
      this.buttons = buttons;
      /* eslint complexity: ["error", 13] */
      const handler = (i, placeholder) => (event) => {
        if (event.key === 'ArrowDown' || event.keyCode === 40) {
          event.preventDefault();
          buttons[Math.min(buttons.length - 1, i + 1)].focus();
        } else if (event.key === 'ArrowUp' || event.keyCode === 38) {
          event.preventDefault();
          buttons[Math.max(0, i - 1)].focus();
        } else if (event.key === 'Enter' || event.keyCode === 13
          || event.key === ' ' || event.keyCode === 32
          || event.key === 'Tab' || event.keyCode === 9) {
          event.preventDefault();
          this.close(placeholder);
        } else if (event.key === 'Escape' || event.keyCode === 27) {
          event.preventDefault();
          this.close();
        }
      };
      const regex = new RegExp('^(.*)('+this.query+')(.*)$');

      // prepare buttons corresponding to each placeholder
      placeholders.forEach((placeholder, i) => {
        const { label } = placeholder;
        const match = label.match(regex) || [ null, label ];
        const elements = match.slice(1)
          .map((str, i) => {
            if (!str.length)
              return null;

            return h(
              'span',
              { className: i === 1 ? 'matched' : 'unmatched' },
             `${i === 0 ? '#' : ''}${str}`
            );
          }).filter(elem => elem);
        const li = h('li', {},
          h('button', { type: 'button' }, ...elements)
        );

        this.container.appendChild(li);
        buttons[i] = li.firstChild;
        // event handlers will be garbage-collected with button on each re-render
        buttons[i].addEventListener('keydown', handler(i, placeholder));
        buttons[i].addEventListener('mousedown', () => this.close(placeholder));
        buttons[i].addEventListener('focus', () => this.focusedButton = i);
        buttons[i].addEventListener('unfocus', () => this.focusedButton = null);
      });
      this.container.style.display = 'block';
    }

    /**
     * Adds appropriate placeholder if asked and close the list gracefully
     * @param {any} placeholder user chosen placeholder or null
     * @memberof AutoComplete
     */
    close(placeholder) {
      this.container.style.display = 'none';
      this.emptyCompletionsContainer();
      // detaching event handlers (user query finished)
      this.quill.off('selection-change', this.onSelectionChange);
      this.quill.off('text-change', this.onTextChange);
      this.quill.root.removeEventListener('keydown', this.suggestKeydownHandler);
      const delta = new Delta()
        .retain(this.hashIndex)
        .delete(this.query.length + 1);
      // removing user query from before
      this.quill.updateContents(delta, Quill.sources.USER);
      if (placeholder) {
        this.quill.insertEmbed(this.hashIndex, 'placeholder', placeholder, Quill.sources.USER);
        this.quill.setSelection(this.hashIndex + 1, 0, Quill.sources.SILENT);
      }
      this.quill.focus();
      this.open = false;
      this.quill.suggestsDialogOpen = false;
      this.onClose && this.onClose(placeholder || null);
    }

  }

  return AutoComplete;
};

