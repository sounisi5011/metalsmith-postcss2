import Metalsmith from 'metalsmith';

export async function processAsync(
    metalsmith: Metalsmith,
): Promise<Metalsmith.Files> {
    return new Promise((resolve, reject) => {
        metalsmith.process((error, files) => {
            if (error) {
                reject(error);
            } else {
                resolve(files);
            }
        });
    });
}
