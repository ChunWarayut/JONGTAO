/**
 * Custom Modal Dialog Utility for JONGTAO
 * Replaces native alert() and confirm() with themed modals.
 */

function createDialogElement(type, message, resolve) {
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100vw';
    backdrop.style.height = '100vh';
    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    backdrop.style.backdropFilter = 'blur(4px)';
    backdrop.style.zIndex = '9999';
    backdrop.style.display = 'flex';
    backdrop.style.alignItems = 'center';
    backdrop.style.justifyContent = 'center';
    backdrop.style.opacity = '0';
    backdrop.style.transition = 'opacity 0.2s ease';

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'glass-card animate-slide';
    modal.style.width = '90%';
    modal.style.maxWidth = '400px';
    modal.style.padding = 'var(--spacing-xl)';
    modal.style.textAlign = 'center';
    modal.style.transform = 'scale(0.95)';
    modal.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // Icon
    const iconContainer = document.createElement('div');
    iconContainer.style.fontSize = '3rem';
    iconContainer.style.marginBottom = 'var(--spacing-md)';
    iconContainer.innerHTML = type === 'alert' ? 'ℹ️' : '❓';

    // Message
    const msgEl = document.createElement('p');
    msgEl.style.fontSize = '1.1rem';
    msgEl.style.color = 'var(--text-light)';
    msgEl.style.marginBottom = 'var(--spacing-xl)';
    msgEl.style.lineHeight = '1.5';
    msgEl.innerHTML = message.replace(/\n/g, '<br>');

    // Buttons Container
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '12px';
    btnContainer.style.justifyContent = 'center';

    const closeDialog = (result) => {
        backdrop.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        setTimeout(() => {
            if (document.body.contains(backdrop)) {
                document.body.removeChild(backdrop);
            }
            resolve(result);
        }, 200);
    };

    if (type === 'confirm') {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-ghost';
        cancelBtn.innerText = 'ยกเลิก';
        cancelBtn.style.flex = '1';
        cancelBtn.onclick = () => closeDialog(false);

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.innerText = 'ยืนยัน';
        confirmBtn.style.flex = '1';
        confirmBtn.onclick = () => closeDialog(true);

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(confirmBtn);
    } else {
        const okBtn = document.createElement('button');
        okBtn.className = 'btn btn-primary';
        okBtn.innerText = 'ตกลง';
        okBtn.style.minWidth = '120px';
        okBtn.onclick = () => closeDialog(true);
        btnContainer.appendChild(okBtn);
    }

    modal.appendChild(iconContainer);
    modal.appendChild(msgEl);
    modal.appendChild(btnContainer);
    backdrop.appendChild(modal);

    document.body.appendChild(backdrop);

    // Trigger animation
    requestAnimationFrame(() => {
        backdrop.style.opacity = '1';
        modal.style.transform = 'scale(1)';
    });
}

export function showAlert(message) {
    return new Promise((resolve) => {
        createDialogElement('alert', message, resolve);
    });
}

export function showConfirm(message) {
    return new Promise((resolve) => {
        createDialogElement('confirm', message, resolve);
    });
}
