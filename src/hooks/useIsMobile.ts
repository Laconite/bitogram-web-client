export const isMobile = /Android|iPhone|iPad|iPod|Windows Phone|IEMobile|BlackBerry|BB10|Opera Mini|webOS|Palm/i.test(navigator.userAgent)
                 || 'ontouchstart' in window
                 || navigator.maxTouchPoints > 0;