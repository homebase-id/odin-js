export const getOperatingSystem = (userAgentVal?: string) => {
  const userAgent = userAgentVal || navigator.userAgent;

  const os: { name?: string; version?: string } = {
    name: undefined,
    version: undefined,
  };

  // extract operating system name from user agent
  if (userAgent.indexOf('Windows') >= 0) {
    if (userAgent.indexOf('Windows Phone') >= 0) {
      os.name = 'Windows Phone';
    } else {
      os.name = 'Windows';
    }
  }

  if (userAgent.indexOf('OS X') >= 0 && userAgent.indexOf('Android') === -1) {
    os.name = 'OS X';
  }

  if (userAgent.indexOf('Linux') >= 0) {
    os.name = 'Linux';
  }

  if (userAgent.indexOf('like Mac OS X') >= 0) {
    os.name = 'iOS';
  }

  if (
    (userAgent.indexOf('Android') >= 0 || userAgent.indexOf('Adr') >= 0) &&
    userAgent.indexOf('Windows Phone') === -1
  ) {
    os.name = 'Android';
  }

  if (userAgent.indexOf('BB10') >= 0) {
    os.name = 'BlackBerry';
  }

  if (userAgent.indexOf('RIM Tablet OS') >= 0) {
    os.name = 'BlackBerry Tablet OS';
  }

  if (userAgent.indexOf('BlackBerry') >= 0) {
    os.name = 'BlackBerryOS';
  }

  if (userAgent.indexOf('CrOS') >= 0) {
    os.name = 'Chrome OS';
  }

  if (userAgent.indexOf('KAIOS') >= 0) {
    os.name = 'KaiOS';
  }

  // extract operating system version from user agent
  let match = null;

  switch (os.name) {
    case 'Windows':
    case 'Windows Phone':
      if (userAgent.indexOf('Win16') >= 0) {
        os.version = '3.1.1';
      } else if (userAgent.indexOf('Windows CE') >= 0) {
        os.version = 'CE';
      } else if (userAgent.indexOf('Windows 95') >= 0) {
        os.version = '95';
      } else if (userAgent.indexOf('Windows 98') >= 0) {
        if (userAgent.indexOf('Windows 98; Win 9x 4.90') >= 0) {
          os.version = 'Millennium Edition';
        } else {
          os.version = '98';
        }
      } else {
        match = userAgent.match(
          /Win(?:dows)?(?: Phone)?[ _]?(?:(?:NT|9x) )?((?:(\d+\.)*\d+)|XP|ME|CE)\b/
        );

        if (match && match[1]) {
          switch (match[1]) {
            case '6.4':
              // some versions of Firefox mistakenly used 6.4
              match[1] = '10.0';
              break;
            case '6.3':
              match[1] = '8.1';
              break;
            case '6.2':
              match[1] = '8';
              break;
            case '6.1':
              match[1] = '7';
              break;
            case '6.0':
              match[1] = 'Vista';
              break;
            case '5.2':
              match[1] = 'Server 2003';
              break;
            case '5.1':
              match[1] = 'XP';
              break;
            case '5.01':
              match[1] = '2000 SP1';
              break;
            case '5.0':
              match[1] = '2000';
              break;
            case '4.0':
              match[1] = '4.0';
              break;
            default:
              // nothing
              break;
          }
        }
      }
      break;
    case 'OS X':
      match = userAgent.match(/OS X ((\d+[._])+\d+)\b/);
      break;
    case 'Linux':
      // linux user agent strings do not usually include the version
      os.version = undefined;
      break;
    case 'iOS':
      match = userAgent.match(/OS ((\d+[._])+\d+) like Mac OS X/);
      break;
    case 'Android':
      match = userAgent.match(/(?:Android|Adr) (\d+([._]\d+)*)/);
      break;
    case 'BlackBerry':
    case 'BlackBerryOS':
      match = userAgent.match(/Version\/((\d+\.)+\d+)/);
      break;
    case 'BlackBerry Tablet OS':
      match = userAgent.match(/RIM Tablet OS ((\d+\.)+\d+)/);
      break;
    case 'Chrome OS':
      os.version = undefined;
      break;
    case 'KaiOS':
      match = userAgent.match(/KAIOS\/(\d+(\.\d+)*)/);
      break;
    default:
      // no good default behavior
      os.version = undefined;
      break;
  }

  if (match && match[1]) {
    // replace underscores in version number with periods
    match[1] = match[1].replace(/_/g, '.');
    os.version = match[1];
  }

  // handle Mac OS X / OS X / macOS naming conventions
  if (os.name === 'OS X' && os.version) {
    var versions = os.version.split('.');
    if (versions.length >= 2) {
      var minorVersion = parseInt(versions[1], 10);
      if (minorVersion <= 7) {
        os.name = 'Mac OS X';
      } else if (minorVersion >= 12) {
        os.name = 'macOS';
      } else {
        os.name = 'OS X';
      }
    }
  }

  return `${os.name}`;
};

export const getBrowser = (userAgentVal?: string) => {
  const userAgent = userAgentVal || navigator.userAgent;

  if (userAgent.indexOf('Trident') >= 0 || userAgent.indexOf('MSIE') >= 0) {
    if (userAgent.indexOf('Mobile') >= 0) {
      return 'IE Mobile';
    } else {
      return 'Internet Explorer';
    }
  }

  if (userAgent.indexOf('Firefox') >= 0 && userAgent.indexOf('Seamonkey') === -1) {
    return 'Firefox';
  }

  if (
    userAgent.indexOf('Safari') >= 0 &&
    userAgent.indexOf('Chrome') === -1 &&
    userAgent.indexOf('Chromium') === -1 &&
    userAgent.indexOf('Android') === -1
  ) {
    if (userAgent.indexOf('CriOS') >= 0) {
      return 'Chrome for iOS';
    } else if (userAgent.indexOf('FxiOS') >= 0) {
      return 'Firefox for iOS';
    } else {
      return 'Safari';
    }
  }

  if (userAgent.indexOf('Chrome') >= 0) {
    if (userAgent.match(/\bChrome\/[.0-9]* Mobile\b/)) {
      if (userAgent.match(/\bVersion\/\d+\.\d+\b/) || userAgent.match(/\bwv\b/)) {
        return 'WebView on Android';
      } else {
        return 'Chrome';
      }
    } else {
      return 'Chrome';
    }
  }

  if (
    userAgent.indexOf('Android') >= 0 &&
    userAgent.indexOf('Chrome') === -1 &&
    userAgent.indexOf('Chromium') === -1 &&
    userAgent.indexOf('Trident') === -1 &&
    userAgent.indexOf('Firefox') === -1
  ) {
    return 'Android Browser';
  }

  if (userAgent.indexOf('Edge') >= 0) {
    return 'Edge';
  }

  if (userAgent.indexOf('UCBrowser') >= 0) {
    return 'UC Browser for Android';
  }

  if (userAgent.indexOf('SamsungBrowser') >= 0) {
    return 'Samsung Internet';
  }

  if (userAgent.indexOf('OPR') >= 0 || userAgent.indexOf('Opera') >= 0) {
    if (userAgent.indexOf('Opera Mini') >= 0) {
      return 'Opera Mini';
    } else if (
      userAgent.indexOf('Opera Mobi') >= 0 ||
      userAgent.indexOf('Opera Tablet') >= 0 ||
      userAgent.indexOf('Mobile') >= 0
    ) {
      return 'Opera Mobile';
    } else {
      return 'Opera';
    }
  }

  if (
    userAgent.indexOf('BB10') >= 0 ||
    userAgent.indexOf('PlayBook') >= 0 ||
    userAgent.indexOf('BlackBerry') >= 0
  ) {
    return 'BlackBerry';
  }

  if (userAgent.indexOf('MQQBrowser') >= 0) {
    return 'QQ Browser';
  }
};
