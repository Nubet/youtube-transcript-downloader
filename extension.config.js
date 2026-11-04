/** @type {import('extension').FileConfig} */
export default {
  browser: {
    chrome: {profile: './dist/extension-profile-chrome'},
    firefox: {profile: './dist/extension-profile-firefox'},
  },
}
