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
type CSSProperties = import('csstype').PropertiesHyphen
export interface ElementAttributes {
    /**
     * CSS of this element.
     *
     * Google's original proposal does not contains
     * the object type `PropertiesHyphen`.
     *
     * It is handled and transformed by this library.
     */
    style?: string | CSSProperties
    children?: JSX.Element[]
    onClick?(): void
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
    const props: ElementAttributes | ImageElementAttributes | ObjectElementAttributes | null = _props as any

    if (tag === 'img') {
        const { height = 'initial', src, width = 'initial', style, ...props } = _props as ImageElementAttributes
        try {
            const url = new URL(src, location.href)
            return createElement('div', {
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
            return createElement('div', {})
        }
    }

    if (props) {
        // Transform CSS.PropertiesHyphen into string
        if ('style' in props) {
            const oldProps = props.style
            if (typeof oldProps === 'object') {
                props.style = (Object.keys(oldProps) as (keyof typeof oldProps)[])
                    .map(k => k + ': ' + oldProps[k])
                    .join(';')
            }
        }
        // Transform onClick
        if ('onClick' in props) {
            installCustomObjectFormatter(new onClickHandler())
            const { onClick, ...nextProps } = props
            const specObject = onClickHandler.make(createElementTyped(tag, nextProps, ..._), onClick!)
            return createElementTyped('object', { object: specObject })
        }
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
//#endregion
