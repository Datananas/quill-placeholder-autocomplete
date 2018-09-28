# quill-placeholder-autocomplete
brings autocomplete to [quill-placeholder-module](https://github.com/jspaine/quill-placeholder-module)

## CI status
[ ![Codeship Status for Datananas/quill-placeholder-autocomplete](https://app.codeship.com/projects/19a30040-d83b-0135-4786-2a3c011fd6eb/status?branch=master)](https://app.codeship.com/projects/263594)

## Install
+ using NPM:
  ```
  npm install --save quill-placeholder-autocomplete-module quill-placeholder-module
  ```
+ using yarn:
  ```
  yarn add quill-placeholder-autocomplete-module quill-placeholder-module
  ```

## Usage
```js
import getPlaceholderModule from 'quill-placeholder-module';
import getAutocompleteModule from 'quill-placeholder-autocomplete-module';

Quill.register('modules/placeholder', getPlaceholderModule(Quill,  {
  className: 'ql-placeholder-content',        // default
}));
Quill.register('modules/autocomplete', getAutocompleteModule(Quill));

const placeholders = [
  {id: 'foo', label: 'Foo'},
  {id: 'required', label: 'Required', required: true}
]

var quill = new Quill('#editor', {
  modules: {
    toolbar: {container: `#toolbar`},
    placeholder: {
      delimiters: ['{', '}'],                   // default
      placeholders
    },
    autocomplete: {
      getPlaceholders: () => placeholders       // factory
      container: '#completions',                // can also be return of `document.querySelector` or kept `undefined`
      triggerKey: '#',                          // default
      endKey: '#',                              // optional
      debounceTime: 0,                          // 0: disabled (default)
      onOpen: () => console.log('opened'),                                      // optional
      onClose: (placeholder) => console.log('user choosed:', placeholder),      // optional
      fetchPlaceholders: (query) => fetch(...).then(...)                        // optional
      onFetchStarted: (query) => console.log('user searching for:', query),     // optional
      onFetchFinished: (results) => console.log('possible results:', results),  // optional
    }
  },
  placeholder: 'Compose an epic...',
  theme: 'snow'
});
```
