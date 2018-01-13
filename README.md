# quill-placeholder-autocomplete
brings autocomplete to [quill-placeholder-module](https://github.com/jspaine/quill-placeholder-module)

## Install
+ using NPM:
  ```
  npm install --save quill-placeholder-autocomplete-module
  ```
+ using yarn:
  ```
  yarn add quill-placeholder-autocomplete-module
  ```
  
## Usage
```js
import getPlaceholderModule from 'quill-placeholder-module';
import getAutocompleteModule from 'quill-placeholder-autocomplete-module';

Quill.register('modules/placeholder', getPlaceholderModule(Quill));
Quill.register('modules/autocomplete', getAutocompleteModule(Quill));

const placeholders = [
  {id: 'foo', label: 'Foo'},
  {id: 'required', label: 'Required', required: true}
]

var quill = new Quill('#editor', {
  modules: {
    toolbar: {container: `#toolbar`},
    placeholder: {
      delimiters: ['{', '}'],               // default
      className: 'ql-placeholder-content',  // default
      placeholders
    },
    autocomplete: {
      getPlaceholders: () => placeholders       // factory
      container: '#completions',               // can also be return of `document.querySelector` or keeped to `undefined`
      onOpen: () => console.log('opened'),    // optional
      onClose: (placeholder) => console.log('user choosed:', placeholder),  //optional
    }
  },
  placeholder: 'Compose an epic...',
  theme: 'snow'
});
```
