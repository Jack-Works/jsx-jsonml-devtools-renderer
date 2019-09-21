import * as React from './index'
export = React
/**
 * @see: https://docs.google.com/document/d/1FTascZXT9cxfetuPRT2eXPQKXui4nWFivUnS_335T3U/preview
 */
declare global {
    namespace JSX {
        type Element = React.ElementAttributes | React.ObjectElementAttributes | string | number
        interface IntrinsicElements {
            div: React.ElementAttributes
            span: React.ElementAttributes
            ol: React.ElementAttributes
            li: React.ElementAttributes
            table: React.ElementAttributes
            tr: React.ElementAttributes
            td: React.ElementAttributes
            object: React.ObjectElementAttributes
            img: React.ImageElementAttributes
        }
    }
    //#endregion
}

declare global {
    interface Window {
        devtoolsFormatters?: React.CustomObjectFormatter[]
    }
}
