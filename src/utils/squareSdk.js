let currentLoadedEnv = null;
let loadingPromise = null;

/**
 * Dynamically loads the Square Web Payments SDK for the specified environment.
 * If the wrong environment's SDK is already loaded, it cleans it up (removes script
 * tags and deletes window.Square) before injecting the correct one.
 *
 * @param {string} environment - 'production' or 'sandbox'
 * @returns {Promise<any>} Resolves with window.Square
 */
export function loadSquareSdk(environment) {
    const targetEnv = environment === 'production' ? 'production' : 'sandbox';
    const targetSrc = targetEnv === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

    const otherSrc = targetEnv === 'production'
        ? 'https://sandbox.web.squarecdn.com/v1/square.js'
        : 'https://web.squarecdn.com/v1/square.js';

    // If we already loaded the correct environment, return resolved
    if (window.Square && currentLoadedEnv === targetEnv) {
        return Promise.resolve(window.Square);
    }

    // If we are currently loading the correct environment, return that promise
    if (loadingPromise && currentLoadedEnv === targetEnv) {
        return loadingPromise;
    }

    // Clean up different environment if loaded
    const otherScript = document.querySelector(`script[src="${otherSrc}"]`);
    if (otherScript) {
        otherScript.remove();
    }
    // Remove any extra script tags of Square SDK to prevent duplicate injections
    document.querySelectorAll('script[src^="https://web.squarecdn.com"]').forEach(el => el.remove());
    document.querySelectorAll('script[src^="https://sandbox.web.squarecdn.com"]').forEach(el => el.remove());

    if (window.Square) {
        try {
            delete window.Square;
        } catch (e) {
            window.Square = undefined;
        }
    }

    currentLoadedEnv = targetEnv;

    loadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = targetSrc;
        script.onload = () => {
            if (window.Square) {
                resolve(window.Square);
            } else {
                reject(new Error('Square SDK loaded but window.Square is not defined.'));
            }
        };
        script.onerror = (err) => {
            currentLoadedEnv = null;
            loadingPromise = null;
            reject(err);
        };
        document.head.appendChild(script);
    });

    return loadingPromise;
}
