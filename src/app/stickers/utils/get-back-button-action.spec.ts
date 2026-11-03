import { getBackButtonAction } from './get-back-button-action';

describe('getBackButtonAction', () => {
  it('closes the dialog first, wherever the user is', () => {
    expect(
      getBackButtonAction({ isDialogOpen: true, path: '/dashboard/trending', canGoBack: false }),
    ).toBe('close-dialog');
    expect(
      getBackButtonAction({ isDialogOpen: true, path: '/dashboard/favorites', canGoBack: true }),
    ).toBe('close-dialog');
  });

  it('minimizes the app on the home screen even if there is history', () => {
    expect(
      getBackButtonAction({ isDialogOpen: false, path: '/dashboard/trending', canGoBack: true }),
    ).toBe('minimize');
  });

  it('ignores the query string and fragment when checking the home screen', () => {
    expect(
      getBackButtonAction({ isDialogOpen: false, path: '/dashboard/trending?x=1#top', canGoBack: true }),
    ).toBe('minimize');
  });

  it('goes back on other screens when there is history', () => {
    expect(
      getBackButtonAction({ isDialogOpen: false, path: '/dashboard/search?q=gatos', canGoBack: true }),
    ).toBe('back');
  });

  it('goes to the home screen when there is no history', () => {
    expect(
      getBackButtonAction({ isDialogOpen: false, path: '/dashboard/history/gatos', canGoBack: false }),
    ).toBe('go-home');
  });

  it('does not treat a screen that starts like the home path as home', () => {
    expect(
      getBackButtonAction({ isDialogOpen: false, path: '/dashboard/trending-old', canGoBack: false }),
    ).toBe('go-home');
  });
});
