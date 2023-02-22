
/**
 * It creates an image element, sets its source to a base64 encoded AVIF image, and then returns true
 * if the image loads successfully
 * https://stackoverflow.com/questions/5573096/detecting-webp-support
 *
 * @returns A boolean value.
 */
export async function detectAvifSupport (): Promise<boolean> {
  const testImageSources = [
    'data:image/avif;base64,AAAAHGZ0eXBtaWYxAAAAAG1pZjFhdmlmbWlhZgAAAPFtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAABEAAAQABAAAAAAEVAAEAAAAfAAAAKGlpbmYAAAAAAAEAAAAaaW5mZQIAAAAAAQAAYXYwMUltYWdlAAAAAHBpcHJwAAAAUWlwY28AAAAUaXNwZQAAAAAAAAABAAAAAQAAABBwYXNwAAAAAQAAAAEAAAAVYXYxQ4EgAAAKBzgABpAQ0AIAAAAQcGl4aQAAAAADCAgIAAAAF2lwbWEAAAAAAAAAAQABBAECg4QAAAAnbWRhdAoHOAAGkBDQAjIUFkAAAEgAAAwGbmVx8APS84zVsoA='
  ]

  const testImage = async (src: string): Promise<boolean> => {
    return await new Promise(resolve => {
      const img = document.createElement('img')
      img.onerror = () => { resolve(false) }
      img.onload = () => { resolve(true) }
      img.src = src
    })
  }

  const results = await Promise.all(testImageSources.map(testImage))

  return results.every(result => !!result)
}

/**
 * "If the browser can play a video with the codec av01.0.05M.08, then it supports AV1."
 *
 * The function is pretty simple. It creates a video element, and then checks if the browser can play a
 * video with the codec av01.0.05M.08. If it can, then it returns "probably". If it can't, then it
 * returns ""
 *
 * @returns A boolean value.
 */
export function hasAv1Support (): boolean {
  const vid = document.createElement('video')
  return vid.canPlayType('video/mp4; codecs="av01.0.05M.08"') === 'probably'
}
