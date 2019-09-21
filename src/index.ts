/// <reference path="./global.d.ts" />
/**
 * @see: https://docs.google.com/document/d/1FTascZXT9cxfetuPRT2eXPQKXui4nWFivUnS_335T3U/preview
 */
//#region Internal Symbols
const JSX_Symbol = Symbol.for('JSON ML <=> JSX internal Symbol')
const onClickHandler_Symbol = Symbol.for('Devtools Clickable Content')
//#endregion

//#region CustomObjectFormatter interface and installer
export interface CustomObjectFormatter<T = any> {
    /**
     * Returns a single-line summary of the object or null.
     * If null is returned, the default format will be used.
     * @param object
     * @param config
     * You can specify “config” attribute in object tag and assign it
     * to an arbitrary object, this object will be passed here as second parameter.
     */
    header(object: unknown, config?: T): JSX.Element | null
    /**
     * Returns true if the object can be opened to show more detail.
     * @param object
     * @param config same as in header function.
     */
    hasBody(object: unknown, config?: T): boolean
    /**
     * Returns the expanded version of the object, to be displayed after it's opened.
     * @param object
     * @param config same as in header function.
     */
    body(object: unknown, config?: T): JSX.Element
}
/**
 * Install a Custom Object Formatter
 * @param formatter The formatter
 */
export function installCustomObjectFormatter(formatter: CustomObjectFormatter) {
    // @ts-ignore
    const old = new Set(window.devtoolsFormatters || [])
    old.add(formatter)
    // @ts-ignore
    window.devtoolsFormatters = Array.from(old)
}

//#endregion

//#region Types
type JSONML = [keyof JSX.IntrinsicElements, ElementAttributes | ObjectElementAttributes, ...any[]] | string | number
export type Variants = keyof typeof darkTheme
export type CSSProperties = import('csstype').PropertiesHyphen | import('csstype').Properties
export interface ElementAttributes {
    /**
     * CSS of this element.
     *
     * Google's original proposal does not contains
     * the object type `CSS.Properties`.
     *
     * It is handled and transformed by this library.
     */
    style?: string | CSSProperties
    children?: JSX.Element[]
    /**
     * onClick event of the element.
     */
    onClick?(): void
    variant?: Variants[]
}
export interface ImageElementAttributes extends ElementAttributes {
    src: string
    width?: number | string
    height?: number | string
}
export interface ObjectElementAttributes {
    object?: unknown
    config?: any
}
//#endregion

//#region Core renderer
export const Fragment = 'span'
export function isJSXElement(x: unknown): x is JSX.Element {
    return Array.isArray(x) && Reflect.get(x, JSX_Symbol)
}
export function createElementTyped(
    tag: keyof JSX.IntrinsicElements,
    _props: ElementAttributes | ObjectElementAttributes | null,
    ..._: JSX.Element[]
): JSX.Element {
    // If object has children, Chrome will not render it normally
    if (tag === 'object') _ = []
    const props: ElementAttributes | ImageElementAttributes | ObjectElementAttributes = (_props || {}) as any

    if (customElements.has(tag)) {
        const handler = customElements.get(tag)!
        if (typeof handler === 'function') return handler(props, ..._)
        else {
            const { style, ...rest } = props as ElementAttributes
            return createElementTyped(
                handler[0],
                {
                    style: normalizeStyle(handler[1]) + normalizeStyle(style),
                    ...rest
                },
                ..._
            )
        }
    }

    // Handle themes
    if ('variant' in props && props.variant) {
        const theme = matchMedia(`(prefers-color-scheme: dark)`).matches ? darkTheme : lightTheme
        const presetStyles = props.variant.map(type => theme[type])
        props.style = Object.assign({}, ...presetStyles, props.style)
    }
    // Transform CSS.PropertiesHyphen into string
    if ('style' in props) {
        props.style = normalizeStyle(props.style)
    }
    // Transform onClick
    if ('onClick' in props) {
        installCustomObjectFormatter(new onClickHandler())
        const { onClick, ...nextProps } = props
        const specObject = onClickHandler.make(createElementTyped(tag, nextProps, ..._), onClick!)
        return createElementTyped(tag, null, createElementTyped('object', { object: specObject }))
    }

    const children: JSONML[] = []
    for (const child of _) {
        // If child is null, omit it.
        if (child === null) continue
        // Add primitive values and JSX.Element as a child
        if (isRenderableJSONML(child)) {
            children.push(child)
            continue
        }
        // If child is an Array, and every of its child is JSX.Element
        // though it as pattern like {arr.map(x => <div />)}
        if (Array.isArray(child)) {
            if (child.every(x => isRenderableJSONML(x))) {
                children.push(...child)
                continue
            }
        }
        // Else, display non-primitive values as devtools raw formatter
        children.push(['object', { object: child }])
    }
    // <object> cannot have children, or it will not render normally.
    if (children.length === 0 && tag !== 'object') children.push('')
    return makeArrayToJSXElement([tag, props, ...children])
}
export const createElement = createElementTyped as (tag: string, props: any, ...children: any[]) => JSX.Element
//#endregion

//#region Non-standard elements and attributes
/**
 * Handler for onClick event
 */
class onClickHandler implements CustomObjectFormatter {
    static instance: onClickHandler
    constructor() {
        if (onClickHandler.instance) return onClickHandler.instance
        onClickHandler.instance = this
    }
    static make(jsx: JSX.Element, onClick: () => void) {
        const self = { [onClickHandler_Symbol]: () => [jsx, onClick, self] }
        return self
    }
    hasBody(obj: any) {
        return !!obj[onClickHandler_Symbol]
    }
    body(obj: any, config: any) {
        const [jsx, f, ref] = obj[onClickHandler_Symbol]()
        f()
        return createElementTyped('div', {}, createElementTyped('object', { object: ref }))
    }
    header(obj: any) {
        if (this.hasBody(obj)) {
            const [jsx, f] = obj[onClickHandler_Symbol]()
            return jsx
        }
        return null
    }
}

//#endregion

//#region Helper
function makeArrayToJSXElement(x: any[]): JSX.Element {
    Reflect.set(x, JSX_Symbol, true)
    return x as JSX.Element
}
function isRenderableJSONML(x: unknown): x is JSONML {
    if (isJSXElement(x)) return true
    // We will ignore the `null` value
    if (x === null) return true
    if (typeof x === 'object') return false
    return true
}
function normalizeStyle(style: CSSProperties | undefined | string) {
    if (style === undefined) return ''
    if (typeof style === 'string') return style + ';'
    return (
        (Object.keys(style) as (keyof typeof style)[])
            .map(
                k =>
                    // Transform propertyName to property-name
                    k.replace(/([a-z][A-Z])/g, function(g) {
                        return g[0] + '-' + g[1].toLowerCase()
                    }) +
                    ': ' +
                    style[k]
            )
            .join(';') + ';'
    )
}
//#endregion

//#region Keep states
const objectMap = new WeakMap<object, any>()
export function useState<State, T extends object = object>(bindingObject: T, initialState: (obj: T) => State) {
    if (typeof bindingObject !== 'object' || bindingObject === null) {
        throw new Error('Can not bind state to a non-object')
    }
    let state: Readonly<State>
    if (objectMap.has(bindingObject)) state = objectMap.get(bindingObject)!
    else state = initialState ? initialState(bindingObject) : ({} as State)
    objectMap.set(bindingObject, state)
    return [
        state,
        function setState(nextState: Partial<Readonly<State>>) {
            state = Object.assign(state, nextState)
            objectMap.set(bindingObject, state)
        },
        function forceRender() {
            console.clear()
            console.log(bindingObject)
        }
    ] as const
}
//#endregion

//#region Common CSS
const codeBlock: CSSProperties = { fontStyle: 'italic', fontFamily: 'monospace' }
const dimmed: CSSProperties = { opacity: 0.6 }
const darkTheme = {
    propertyPreviewName: { color: 'rgb(169, 169, 169)' },
    functionPrefix: { color: 'rgb(85, 106, 242)' },
    propertyName: { color: 'rgb(227, 110, 236)' },
    null: { color: 'rgb(127, 127, 127)' },
    bigint: { color: 'rgb(158, 255, 158)' },
    number: { color: 'hsl(252, 100%, 75%)' },
    string: { color: 'rgb(233, 63, 59)', whiteSpace: 'pre', 'unicode-bidi': '-webkit-isolate' },
    quote: { color: 'rgb(213, 213, 213)' },
    node: { color: 'rgb(189, 198, 207)' },
    fade: dimmed,
    code: codeBlock
}
const lightTheme = {
    propertyPreviewName: { color: '#565656' },
    functionPrefix: { color: 'rgb(13, 34, 170)' },
    propertyName: { color: 'rgb(136, 19, 145)' },
    null: { color: 'rgb(128, 128, 128)' },
    bigint: { color: 'rgb(0, 93, 0)' },
    number: { color: 'rgb(28, 0, 207)' },
    string: { color: 'rgb(196, 26, 22)', whiteSpace: 'pre', 'unicode-bidi': '-webkit-isolate' },
    quote: { color: '#222' },
    node: { color: 'rgb(48, 57, 66)' },
    fade: dimmed,
    code: codeBlock
} as typeof darkTheme
//#endregion

//#region custom elements
const customElements = new Map<
    keyof JSX.IntrinsicElements,
    ((props: any, ...children: JSX.Element[]) => JSX.Element) | [keyof JSX.IntrinsicElements, CSSProperties]
>()
customElements.set('code', ['span', codeBlock])
customElements.set('br', ['div', { display: 'block', marginTop: '0.5em' }])
customElements.set('img', (_props: ImageElementAttributes = {} as any, ...children) => {
    const { height = 'initial', src, width = 'initial', style, ...props } = _props
    try {
        const url = new URL(src, location.href)
        return createElement('span', {
            style: {
                content: `url("${url.toJSON()}")`,
                width: typeof width === 'number' ? width + 'px' : width,
                height: typeof height === 'number' ? height + 'px' : height,
                ...((style || {}) as CSSProperties)
            } as CSSProperties,
            ...props
        })
    } catch (e) {
        console.error(e, src)
        return createElement('span', {}, e && e.message)
    }
})
//#endregion
