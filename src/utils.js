/**
 * Utility fonction
 * Create DOM elements/trees with functional approach
 * @param {String} tag the Tag name
 * @param {Object} attrs attribute to apply to tag
 * @param {Element} children allow to compose functionaly
 * @returns {Element} the full DOM tree
 */
export const h = (tag, attrs, ...children) => {
  const elem = document.createElement(tag);
  Object.keys(attrs).forEach(key => elem[key] = attrs[key]);
  children.forEach(child => {
    if (typeof child === 'string')
      child = document.createTextNode(child);
    elem.appendChild(child);
  });
  return elem;
};
