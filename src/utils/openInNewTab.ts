export const openInNewTab = (url: string): void => {
    if (url.startsWith('mailto:')) {
        const a = document.createElement('a');
        a.href = url;
        a.click();
        return;
    }
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
    if (newWindow) newWindow.opener = null
}

export const onClickUrl = (url: string): (() => void) => () => openInNewTab(url);
