<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="400" cellpadding="0" cellspacing="0" style="background-color:#141414;border:1px solid rgba(212,175,55,0.2);border-radius:16px;padding:32px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="color:#D4AF37;font-size:12px;letter-spacing:3px;font-weight:bold;">SCRIPTORIUM</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <p style="color:#EDEBE4;font-size:14px;margin:0;">Your one-time verification code is:</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <span style="color:#D4AF37;font-size:36px;font-weight:bold;letter-spacing:8px;">{{ $code }}</span>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="color:#9C9691;font-size:12px;margin:0;">This code expires in {{ $expiryMinutes }} minutes. If you didn't request this, you can ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
