/**
 * @see https://sourcemaps.info/spec.html#h.lmz475t4mvbx
 */
export function getSourceMappingURL(cssText: string): string | null {
    const pattern = /\/\*\s*# sourceMappingURL=((?:(?!\*\/).)*)\*\//g;
    let url: string | null = null;

    let match: ReturnType<typeof pattern.exec>;
    while ((match = pattern.exec(cssText))) {
        url = match[1].trim();
    }

    return url;
}

export function isDataURL(url: string): boolean {
    return url.startsWith('data:');
}
