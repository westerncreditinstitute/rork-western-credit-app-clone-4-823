export const HEYGEN_AVATAR_EMBED_CODE = `
<iframe src="https://embed.liveavatar.com/v1/fc10fdcf-a898-4e4c-9996-b58705643f75" allow="microphone" title="LiveAvatar Embed" style="width: 100%; height: 100%; border: none;"></iframe>
`;

export const HEYGEN_AVATAR_HTML = (embedCode: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 100%;
      height: 100vh;
      overflow: hidden;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #heygen-avatar-container {
      width: 100%;
      height: 100%;
    }
    #heygen-avatar-container > * {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  ${embedCode}
</body>
</html>
`;
