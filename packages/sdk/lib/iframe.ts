import { Emitter } from 'mitt';
import { abort } from './utils';
import { Events } from './types';

/**
 * Use an iframe for passkey to get a consistent RPID.
 * This makes wallets with passkeys available across different domains.
 */
export class PasskeyIframe {
  src = import.meta.env.VITE_PASSKEY_IFRAME_URL ?? 'https://app.apillon.io/ew/index.html';
  origin = import.meta.env.VITE_PASSKEY_IFRAME_ORIGIN ?? 'https://app.apillon.io';
  events: Emitter<Events>;
  lastEventId = 0; // use this to match iframe response with promise resolvers
  promises: { id: number; resolve: (v: any) => void }[] = [];

  loginIframe: HTMLIFrameElement | undefined;
  registerIframe: HTMLIFrameElement | undefined;

  constructor(events: Emitter<Events>) {
    this.events = events;
    this.initIframe(); // init `get` iframe

    window.addEventListener('message', this.onResponse.bind(this));
  }

  async initIframe(getOrCreate: 'get' | 'create' = 'get', selector = '') {
    if (!window) {
      abort('IFRAME_NOT_INIT');
      return;
    }

    const i = document.createElement('iframe');

    const iframeLoading = new Promise<void>(resolve => {
      i.addEventListener('load', () => resolve(), { once: true });
    });

    i.setAttribute('src', this.src + `#${getOrCreate}`);

    if (getOrCreate === 'get') {
      i.setAttribute('allow', `publickey-credentials-get ${this.origin}`);
      i.style.width = '1px';
      i.style.height = '1px';
      i.style.display = 'none';

      this.loginIframe = i;
    } else {
      i.setAttribute('allow', `publickey-credentials-create ${this.origin}`);
      i.style.width = '100%';
      i.style.height = '52px';

      this.registerIframe = i;
    }

    if (selector) {
      const targetEl = document.querySelector(selector);
      if (targetEl) {
        targetEl.appendChild(i);
      }
    } else {
      document.body.appendChild(i);
    }

    await iframeLoading;
  }

  onResponse(ev: MessageEvent) {
    if (ev?.data?.type === 'apillon_pk_response') {
      const promiseIndex = this.promises.findIndex(x => x.id === ev.data.id);

      if (promiseIndex > -1) {
        this.promises[promiseIndex].resolve(ev.data.content);
        this.promises.splice(promiseIndex, 1);
      }
    } else if (ev?.data?.from === '#create') {
      if (ev?.data?.type === 'apillon_pk_request_username') {
        this.events.emit('iframeUsernameRequested');
      } else if (ev?.data?.type === 'apillon_pk_created') {
        this.events.emit('iframePKCreateResponse', ev.data.content);
      }
    }
  }

  getEventId() {
    this.lastEventId += 1;
    return this.lastEventId;
  }

  /**
   * @deprecated
   */
  async create(hashedUsername: Buffer, username: string) {
    if (!this.registerIframe) {
      return abort('IFRAME_NOT_INIT');
    }

    const id = this.getEventId();

    this.registerIframe.contentWindow?.postMessage(
      {
        type: 'create_pk_credentials',
        id,
        content: {
          hashedUsername,
          username,
        },
      },
      this.origin
    );

    return new Promise<{
      credentialId: Uint8Array;
      pubkey: any;
    }>(resolve => {
      this.promises.push({
        id,
        resolve,
      });
    });
  }

  async get(credentials: Uint8Array[], challenge: Uint8Array) {
    if (!this.loginIframe) {
      return abort('IFRAME_NOT_INIT');
    }

    const id = this.getEventId();

    this.loginIframe.contentWindow?.postMessage(
      {
        type: 'get_pk_credentials',
        id,
        content: {
          credentials,
          challenge,
        },
      },
      this.origin
    );

    return new Promise<{
      credentials: {
        credentialIdHashed: string;
        challenge: Uint8Array;
        resp: {
          authenticatorData: Uint8Array;
          clientDataTokens: {
            t: number;
            k: string;
            v: string;
          }[];
          sigR: bigint;
          sigS: bigint;
        };
      };
    }>(resolve => {
      this.promises.push({
        id,
        resolve,
      });
    });
  }

  async registerInit(selector: string, text = 'Start', variant = 'primary') {
    if (!this.registerIframe) {
      await this.initIframe('create', selector);

      await new Promise(resolve => setTimeout(resolve, 150));

      if (!this.registerIframe) {
        return abort('IFRAME_NOT_INIT');
      }
    }

    this.registerIframe.contentWindow?.postMessage(
      {
        type: 'set_btn_variant',
        content: variant,
      },
      this.origin
    );

    this.registerIframe.contentWindow?.postMessage(
      {
        type: 'set_btn_text',
        content: text,
      },
      this.origin
    );
  }

  async registerSendUsername(hashedUsername: Buffer, username: string) {
    if (!this.registerIframe) {
      return abort('IFRAME_NOT_INIT');
    }

    this.registerIframe.contentWindow?.postMessage(
      {
        type: 'pk_username_data',
        content: {
          hashedUsername,
          username,
        },
      },
      this.origin
    );
  }

  async registerSetLoading(loading = true, noSpinner = false) {
    if (!this.registerIframe) {
      return abort('IFRAME_NOT_INIT');
    }

    this.registerIframe.contentWindow?.postMessage(
      {
        type: 'set_btn_loading',
        content: {
          loading,
          noSpinner,
        },
      },
      this.origin
    );
  }
}
