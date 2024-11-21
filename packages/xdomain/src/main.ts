import { credentialCreate, credentialGet } from './browser-webauthn';

class PasskeyCreateManager {
  btn: HTMLButtonElement | null = null;
  classes = {
    hidden: 'hidden',
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    hover1: 'btn-hover-1',
    ghost: 'btn-ghost',
    hoverGhost: 'btn-hover-ghost',
    disabled: 'btn-disabled',
  } as const;
  hoverClass: 'hover1' | 'hoverGhost' = 'hover1';
  usernameDataResolver: undefined | ((v: { hashedUsername: Buffer; username: string }) => void);

  constructor() {
    if (!window.location.hash.includes('create')) {
      return;
    }

    this.btn = document.getElementById('ew-pk-btn') as HTMLButtonElement | null;
    this.addHandler();
  }

  setButtonClass(c: keyof typeof this.classes, addOrRemove: 'add' | 'remove' = 'add') {
    if (!this.btn) {
      return;
    }

    if (addOrRemove === 'add') {
      this.btn.classList.add(...this.classes[c].split(' '));

      if (c === 'disabled') {
        this.btn.disabled = true;
      }
    } else {
      this.btn.classList.remove(...this.classes[c].split(' '));

      if (c === 'disabled') {
        this.btn.disabled = false;
      }
    }
  }

  setButtonText(t: string) {
    if (!this.btn) {
      return;
    }

    const textEl = this.btn.querySelector('span:last-child');

    if (textEl) {
      textEl.innerHTML = t;
    }

    this.btn.style.visibility = 'visible';
  }

  setLoading(loading = true, noSpinner = false) {
    if (!this.btn) {
      return;
    }

    const spinnerEl = this.btn.querySelector('span:first-child');
    const textEl = this.btn.querySelector('span:last-child');

    if (loading) {
      this.setButtonClass(this.hoverClass, 'remove');
      this.setButtonClass('disabled', 'add');

      if (!noSpinner) {
        spinnerEl?.classList.remove('hidden');
        textEl?.classList.add('hidden');
      }
    } else {
      this.setButtonClass(this.hoverClass, 'add');
      this.setButtonClass('disabled', 'remove');

      if (!noSpinner || textEl?.classList.contains('hidden')) {
        spinnerEl?.classList.add('hidden');
        textEl?.classList.remove('hidden');
      }
    }
  }

  addHandler() {
    if (!this.btn) {
      return;
    }

    this.btn.addEventListener('click', this.onClick.bind(this));
  }

  async onClick() {
    if (!this.btn) {
      return;
    }

    this.setLoading();

    try {
      window.top?.postMessage(
        { type: 'apillon_pk_request_username', from: window.location.hash },
        '*'
      );

      const data = await new Promise<{ hashedUsername: Buffer; username: string }>(
        resolve => (this.usernameDataResolver = resolve)
      );

      const res = await createPasskey(0, data);

      window.top?.postMessage(
        {
          type: 'apillon_pk_created',
          from: window.location.hash,
          content: {
            hashedUsername: data.hashedUsername,
            ...res,
          },
        },
        '*'
      );
    } catch (e) {
      this.setLoading(false);
      throw e;
    }
  }
}

async function createPasskey(
  eventId: number,
  content: { hashedUsername: Buffer; username: string }
) {
  const cred = await credentialCreate(
    {
      name: 'Embedded Wallet Account',
      id: window.location.hostname,
    },
    {
      id: content.hashedUsername,
      name: content.username,
      displayName: content.username,
    },
    crypto.getRandomValues(new Uint8Array(32))
  );

  const res = {
    credentialId: cred.id,
    pubkey: cred.ad.attestedCredentialData!.credentialPublicKey!,
  };

  if (eventId > 0) {
    window.top?.postMessage(
      {
        type: 'apillon_pk_response',
        id: eventId,
        content: res,
      },
      '*'
    );
  }

  return res;
}

async function getPasskey(
  eventId: number,
  content: { credentials: Uint8Array[]; challenge: Uint8Array }
) {
  const credentials = await credentialGet(
    // binary credential ids
    content.credentials,
    // challenge
    content.challenge
  );

  window.top?.postMessage(
    {
      type: 'apillon_pk_response',
      id: eventId,
      content: {
        credentials,
      },
    },
    '*'
  );
}

const ApillonPCM = new PasskeyCreateManager();

window.addEventListener('message', ev => {
  if (ev.data.type === 'set_btn_text') {
    ApillonPCM.setButtonText(ev.data.content);
  } else if (ev.data.type === 'set_btn_variant') {
    if (['primary', 'secondary'].includes(ev.data.content)) {
      ApillonPCM.setButtonClass(ev.data.content);
      ApillonPCM.setButtonClass('hover1');
    } else if (ev.data.content === 'ghost') {
      ApillonPCM.setButtonClass('ghost');
      ApillonPCM.setButtonClass('hoverGhost');
    }
  } else if (ev.data.type === 'set_btn_loading') {
    ApillonPCM.setLoading(!!ev.data.content.loading, !!ev.data.content.noSpinner);
  } else if (ev.data.type === 'pk_username_data') {
    if (ApillonPCM.usernameDataResolver) {
      ApillonPCM.usernameDataResolver(ev.data.content);
    }
  } else if (ev.data.type === 'get_pk_credentials') {
    getPasskey(ev.data.id, ev.data.content);
  } else if (ev.data.type === 'create_pk_credentials') {
    createPasskey(ev.data.id, ev.data.content);
  }
});
