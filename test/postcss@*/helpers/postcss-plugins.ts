import postcss from 'postcss';

/* eslint-disable @typescript-eslint/no-explicit-any */

type TransformerFirstArg = /* Parameters<postcss.Transformer>[0] */ any;

export function doubler(css: TransformerFirstArg): void {
    css.walkDecls((decl: any) => {
        decl.parent.prepend(decl.clone());
    });
}

export function asyncDoubler(css: TransformerFirstArg): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => {
            doubler(css);
            resolve();
        });
    });
}

export function objectDoubler(): /* postcss.Processor */ any {
    const processor = postcss();
    processor.use(doubler);
    return processor;
}
