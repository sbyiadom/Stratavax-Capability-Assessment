// pages/_document.js
// Next.js custom document to set the HTML lang attribute globally.
// Fixes WAVE accessibility error: "Language missing or invalid".

import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* You can add global meta tags or fonts here later */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
