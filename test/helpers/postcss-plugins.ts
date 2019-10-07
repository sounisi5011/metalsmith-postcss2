import postcss from 'postcss';

type TransformerFirstArg = Parameters<postcss.Transformer>[0];

export function doubler(css: TransformerFirstArg): void {
    css.walkDecls(decl => {
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

export function objectDoubler(): postcss.Processor {
    const processor = postcss();
    processor.use(doubler);
    return processor;
}
