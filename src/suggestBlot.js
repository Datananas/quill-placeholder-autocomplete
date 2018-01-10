export default (Quill) => {
  const Inline = Quill.import('blots/inline');

  /**
 * Simple Inline Blot
 * used to buffer user query and provide UI behaviors around
 * @export
 * @class SuggestBlot
 * @extends {Inline}
 */
  class SuggestBlot extends Inline {
    static create(id) {
      const node = super.create();
      node.dataset.id = id;
      return node;
    }
    static formats(node) {
      return node.dataset.id;
    }
    format(name, value) {
      if (name === 'suggest' && value) {
        this.domNode.setAttribute('data-id', value);
      } else {
        super.format(name, value);
      }
    }
    formats() {
      const formats = super.formats();
      formats.suggest = SuggestBlot.formats(this.domNode);
      return formats;
    }
  }
  
  SuggestBlot.blotName = 'suggest';
  SuggestBlot.tagName = 'SPAN';
  SuggestBlot.className = 'suggest';
  
  return SuggestBlot;
};

