import mouseImage from '../assets/mouse.jpg';
import chromeImage from '../assets/chrome-web-store.webp';
import browserImage from '../assets/browser.jpg';
import keyboardImage from '../assets/keyboard.jpg';
import monitorImage from '../assets/monitor.jpg';

export const shopItems = [
  {
    slug: 'chrome-extension-license',
    name: 'Chrome Extension License',
    cost: '1 hour',
    tag: 'extension',
    image: chromeImage,
    desc: 'make your own extension and launch it on the chrome web store :O',
    details: [
       'covers the cost of the chrome extension license',
    ],
  },
  {
    slug: 'browser-subscription-grant',
    name: 'Browser Subscription Grant',
    cost: '5 hours',
    tag: 'stackable',
    image: browserImage,
    desc: 'get those cool paid browsers! better features means a better web for you!',
    details: [
      'grant for buying paid browsers! for example: brave premium',
      '20$ of value!'
    ],
  },
  {
    slug: 'mouse',
    name: 'Razer Basilik V3 X HyperSpeed Mouse',
    cost: '10 hours',
    tag: 'gear',
    image: mouseImage,
    desc: 'an amazing mouse for serious clicking! click away and dominate with them!',
    details: [
      'iconic ergonomic form with 9 customizable controls!',
      'hyperspeed wireless and bluetooth',
      'up to 285 hours of battery life!',
      '5g advanced 18k optical sensor',
      'razer mechanical mouse switches gen-2',
      'powered by razer chroma rgbl with 16.8 million colors!'
    ],
  },
  {
    slug: 'keyboard',
    name: 'AULD F75 Wireless Mechanical Keyboard',
    cost: '15 hours',
    tag: 'gear',
    image: keyboardImage,
    desc: 'very cool keyboard! time to type faster than ever!',
    details: [
      'choose from a few colors to match your taste!',
      'can work with bluetooth, 2.4ghz wireless, or a direct usb wired connection!',
      'a hot-swappable custom base with 3 or 5 pin support, for all your tinkering desires',
      'features 16.8 million rgb lighting color with 16 preset lighting effects as well as others!',
      'has a knob which allows you to switch between gaming mode or office mode seamlessly!',
      'side-prined pbt keycaps to keep up with the trends'
    ],
  },
  {
    slug: 'monitor',
    name: 'AOC Q27G3XMN Gaming Monitor',
    cost: '50 hours',
    tag: 'boss tier',
    image: monitorImage,
    desc: 'cool, big monitor for all your browsing needs! more screens more tabs!',
    details: [
      'best reward we got in the shop!',
      'super big 2560x1440 size',
      'legendarily fast 1ms gray-to-gray and 180 hertz refresh rate!',
      'impressive 134% srgb color gamut, 96% dci-p3 coverage, and vesa displayhdr 1000!',
      'mini-led backlight with 336 local dimming zones',
      '81-key 75% layout compact!'
    ],
  },
];
