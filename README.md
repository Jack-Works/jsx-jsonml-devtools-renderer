## jsx-jsonml-devtools-renderer [![npm][npmicon]][npmurl]

This is a [Custom Object Formatter](https://docs.google.com/document/d/1FTascZXT9cxfetuPRT2eXPQKXui4nWFivUnS_335T3U/preview) for rendering JSX objects in Chrome Devtools. Yes, you can see them in the console now!

  [npmicon]: https://img.shields.io/npm/v/jsx-jsonml-devtools-renderer?style=flat-square
  [npmurl]: https://www.npmjs.com/package/jsx-jsonml-devtools-renderer
  
 <img width="200" src="https://raw.githubusercontent.com/Jack-Works/jsx-jsonml-devtools-renderer/master/preview.png" />

## How to use

```tsx
import React from "jsx-jsonml-devtools-renderer";
class MyObject {
  type = 1;
  innerData = "innerData";
}
class MyObjectCustomFormatter implements React.CustomObjectFormatter {
  hasBody(obj: unknown) {
    if (obj instanceof MyObject) return true;
    return false;
  }
  body(obj: MyObject) {
    return (
      <div>
        <table>
          <tr style="background: rgba(255, 255, 255, 0.6)">
            <td style="min-width: 4em">Type</td>
            <td>Value</td>
          </tr>
          <tr>
            <td>{obj.type}</td>
            <td>{obj.innerData}</td>
          </tr>
        </table>
      </div>
    );
  }
  header(obj: unknown) {
    if (!(obj instanceof MyObject)) return null;
    return <div>MyObject (type: {obj.type})</div>;
  }
}
React.installCustomObjectFormatter(new MyObjectCustomFormatter());
```

## Standard Custom Object Formatters features

|        | div | span | ol  | li  | table | tr  | td  | object |
| ------ | --- | ---- | --- | --- | ----- | --- | --- | ------ |
| style  | ✔   | ✔    | ✔   | ✔   | ✔     | ✔   | ✔   | ❌     |
| object | ❌  | ❌   | ❌  | ❌  | ❌    | ❌  | ❌  | ✔      |

## NON-Standard Custom Object Formatters features

-   an `onClick` attribute is available for any tags except `object`. Due to technical limitation, the `onClick` event will be only fired once.
-   an `img` tag. With attributes `src`(required), `width`(optional) and `height`(optional)
-   a `code` tag.
-   a `br` tag.
-   a `variant` attribute is available for any tags except `object`. It can used to specify some default styles.

## APIs

-   Fragment (Used to support `<></>` syntax)
-   createElement (used to support JSX)
-   createElementTyped (same as createElement, but have a more stricter type)
-   `installCustomObjectFormatter(formatter)` (install the formatter to Chrome devtools)
-   `isJSXElement(x)` is it a JSX Element
-   `const [state, setState, forceRender] = useState(inspectedObject, initialStateCreator)` (used to preserve states between renders)

## JSX Features

### Basic usage

```jsx
return (
    <div style="opacity: 0.7;">
        Content
        <span>(Note)</span>
    </div>
)
```

### Display an object

```jsx
return (
    <span>
        The explicit way: <object object={window} />
        The implicit way: {window}. If window is `null`, renderer will ignore this element.
    </span>
)
```

### Array#map

```jsx
return (
    <span>
        {data.map(x => (
            <object object={x} />
        ))}
    </span>
)
```
