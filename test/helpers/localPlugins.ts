import pluginMap from '../../packages/metalsmith-postcss2/all-pkgs';

export default Object.values(pluginMap).map(
    ({ peerDeps: { postcss: postcssVersion }, module }) => ({
        postcssLocalPlugin: module,
        testNameSuffix: `/ postcss@${postcssVersion}`,
    }),
);
