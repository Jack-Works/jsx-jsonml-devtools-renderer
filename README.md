## Custom Object Formatters JSX Render in Chrome Devtools

See [Custom Object Formatters Chrome Devtools](https://docs.google.com/document/d/1FTascZXT9cxfetuPRT2eXPQKXui4nWFivUnS_335T3U/preview)

## How to use

```tsx
import * as React from 'jsx-jsonml-devtools-renderer'
export class MyObjectCustomFormatter implements React.CustomObjectFormatter {
    hasBody(obj: unknown) {
        if (obj instanceof MyObject) return true
        return false
    }
    body(obj: MyObject) {
        return (
            <div>
                <img src="url" />
                <span style={{ color: 'red' }} onClick={() => alert('Clicked')}>
                    Button!
                </span>
                <object object={window} />
            </div>
        )
    }
    header(obj: unknown) {
        if (!(obj instanceof MyObject)) return null
        return <div>MyObject</div>
    }
}
React.installCustomObjectFormatter(new MyObjectCustomFormatter())
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
