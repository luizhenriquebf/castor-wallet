export function checkForDesktopUpdates(updater, showPrompt, reportError = console.warn) {
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.allowDowngrade = false;
  updater.crossOriginHeaders = () => [];
  updater.on('error', reportError);
  updater.once('update-downloaded', async ({ version }) => {
    try {
      if (await showPrompt(version)) updater.quitAndInstall(true, true);
    } catch (error) {
      reportError(error);
    }
  });
  void updater.checkForUpdates().catch(reportError);
}
