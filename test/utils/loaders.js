/**
 * Load the file at the given url as an ArrayBuffer
 *
 * @param {string} url the url of the file to load
 * @returns {ArrayBuffer} the loaded ArrayBuffer
 */
async function loadToBuffer(url) {
  const data = await fetch(url);
  const blob = await data.blob();
  const buffer = await blob.arrayBuffer();
  return buffer;
}

/**
 * Load the file at the given url and inject it into a script tag on the webpage
 *
 * @param {string} url the url of the file to load
 * @returns {Element} the injected script Element (DOMElement)
 */
async function loadToScriptTag(url) {
  const data = await fetch(url);
  const blob = await data.blob();

  let script;
  const hasLoaded = new Promise((resolve) => {
    script = document.createElement('script');
    script.setAttribute('src', URL.createObjectURL(blob));
    script.setAttribute('type', 'text/javascript');
    document.head.appendChild(script);

    script.onload = () => { resolve(); };
  });

  await hasLoaded;
  return script;
}

export { loadToBuffer, loadToScriptTag };
