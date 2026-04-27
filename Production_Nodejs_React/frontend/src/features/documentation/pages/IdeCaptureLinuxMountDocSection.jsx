import React from 'react';

const p = {
    color: 'var(--text-secondary)',
    lineHeight: 1.65,
    margin: '0 0 0.75rem',
    fontSize: '0.95rem'
};

const ul = {
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    margin: '0 0 0.75rem',
    paddingLeft: '1.25rem',
    fontSize: '0.95rem'
};

const tableWrap = {
    overflowX: 'auto',
    margin: '1rem 0',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    background: 'var(--bg-elevated)'
};

const table = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.88rem',
    minWidth: '480px'
};

const th = {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    background: 'var(--bg-surface)'
};

const td = {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    verticalAlign: 'top'
};

function DocDetails({ title, children, defaultOpen = false, nested = false }) {
    return (
        <details
            className={`doc-details${nested ? ' doc-details--nested' : ''}`}
            open={defaultOpen}
            style={{
                marginBottom: nested ? '10px' : '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                ...(!nested ? { background: 'var(--bg-surface)' } : {})
            }}
        >
            <summary
                style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontSize: nested ? '0.9rem' : '0.95rem',
                    listStyle: 'none',
                    userSelect: 'none'
                }}
            >
                {title}
            </summary>
            <div
                style={{
                    padding: '4px 16px 16px',
                    borderTop: '1px solid var(--border-color)'
                }}
            >
                {children}
            </div>
        </details>
    );
}

function DocMegaSection({ icon, title, subtitle, children, id }) {
    return (
        <section className="doc-mega-section" id={id || undefined} style={id ? { scrollMarginTop: '72px' } : undefined}>
            <h2 className="doc-mega-section__title">
                {icon ? <span aria-hidden>{icon}</span> : null}
                {title}
            </h2>
            {subtitle ? <div className="doc-mega-section__subtitle">{subtitle}</div> : null}
            {children}
        </section>
    );
}

const preBox = {
    ...p,
    padding: '12px 14px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    overflowX: 'auto',
    fontSize: '0.82rem'
};

const kbd = {
    padding: '2px 6px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    fontSize: '0.85rem'
};

const cleanSlateStepBox = {
    marginBottom: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(110, 165, 255, 0.55)',
    background: 'rgba(65, 125, 235, 0.14)',
    fontSize: '0.88rem',
    lineHeight: 1.55,
    color: 'var(--text-secondary)'
};

const cleanSlateStepTitle = {
    fontWeight: 700,
    color: 'var(--accent)',
    marginBottom: '8px',
    fontSize: '0.9rem'
};

const cleanSlatePre = {
    ...preBox,
    marginTop: '8px',
    marginBottom: 0,
    fontSize: '0.78rem',
    lineHeight: 1.45
};

/** Linux workspaceStorage path — /docs#ide-capture-linux-mount */
export default function IdeCaptureLinuxMountDocSection() {
    return (
        <DocMegaSection
            id="ide-capture-linux-mount"
            icon="🔌"
            title="IDE chat capture — Linux workspaceStorage path"
            subtitle={
                <p style={{ ...p, marginBottom: 0 }}>
                    The backend reads Cursor chats from a <strong>POSIX directory</strong> on the machine that runs Node. Use <strong>Step 0</strong>{' '}
                    below (SSH / terminal) to mount or create folders, then you <strong>must</strong> use Control Center <strong>Step 1</strong> →{' '}
                    <strong>Save path</strong> — Step 0 does not configure the server; only the saved path (or{' '}
                    <code style={{ color: 'var(--accent)' }}>CURSOR_WORKSPACE_STORAGE_ROOT</code> if set by ops) tells the backend where to read. Persistent mounts via{' '}
                    <code style={{ color: 'var(--accent)' }}>/etc/fstab</code> or the repo script remain <strong>optional</strong> — see <em>Advanced</em>.
                </p>
            }
        >
            <div
                style={{
                    marginBottom: '1rem',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(80, 227, 194, 0.45)',
                    background: 'rgba(80, 227, 194, 0.1)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    lineHeight: 1.55
                }}
            >
                <strong style={{ color: 'var(--text-primary)' }}>Step 0 — on the API host (SSH)</strong>
                <p style={{ ...p, marginTop: '8px', marginBottom: '10px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>What to pick:</strong> Cursor runs on <strong>Windows</strong>, the Control Center backend runs on <strong>this Linux host</strong>, and both machines can reach each other (LAN, Tailscale, VPN)? → use <strong>A</strong> — you want the Linux server to see the live <code style={{ color: 'var(--accent)' }}>C:\Users\…</code> tree over the network. Use <strong>B</strong> only if <code style={{ color: 'var(--accent)' }}>workspaceStorage</code> is <strong>already</strong> on this Linux machine (you rsync/copy it here, or you use a path like WSL <code style={{ color: 'var(--accent)' }}>/mnt/c/…</code> on the same box) and you will <strong>not</strong> mount SMB onto <code style={{ color: 'var(--accent)' }}>/media/cursor-workspace</code>.
                </p>
                <p style={{ ...p, marginBottom: '8px' }}>
                    <strong>Clean slate — use the terminal if the file manager cannot delete</strong> (common: folder owned by <code style={{ color: 'var(--accent)' }}>root</code>, active SMB mount, or permission denied). The GUI often cannot remove that tree — SSH is the right tool.
                </p>
                <div
                    style={{
                        marginBottom: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '2px solid rgba(255, 143, 143, 0.65)',
                        background: 'rgba(255, 143, 143, 0.12)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.88rem',
                        lineHeight: 1.55
                    }}
                >
                    <strong style={{ color: '#ff8f8f' }}>CAUTION!!!</strong>{' '}
                    <code style={{ color: 'var(--accent)' }}>rm -rf</code> is <strong>irreversible</strong>. Type the path carefully. This removes{' '}
                    <strong>only</strong> the <code style={{ color: 'var(--accent)' }}>cursor-workspace</code> directory under{' '}
                    <code style={{ color: 'var(--accent)' }}>/media</code> — <strong>never</strong> run <code style={{ color: 'var(--accent)' }}>sudo rm -rf /media</code>{' '}
                    (that would wipe unrelated mounts and USB paths). Unmount first so you are not deleting through a live CIFS mount.
                </div>
                <div style={cleanSlateStepBox}>
                    <div style={cleanSlateStepTitle}>1 — Unmount (only if something is mounted here)</div>
                    <p style={{ ...p, marginBottom: '6px', fontSize: '0.85rem' }}>
                        If nothing is mounted, <code style={{ color: 'var(--accent)' }}>findmnt</code> exits with an error and <code style={{ color: 'var(--accent)' }}>umount</code> is not run — that is OK.
                    </p>
                    <pre style={cleanSlatePre}>{`findmnt /media/cursor-workspace && sudo umount /media/cursor-workspace`}</pre>
                </div>
                <div style={cleanSlateStepBox}>
                    <div style={cleanSlateStepTitle}>2 — Delete the folder (irreversible)</div>
                    <p style={{ ...p, marginBottom: '6px', fontSize: '0.85rem' }}>
                        <strong style={{ color: '#ff8f8f' }}>CAUTION!!!</strong> Only this path — <code style={{ color: 'var(--accent)' }}>/media/cursor-workspace</code> — not{' '}
                        <code style={{ color: 'var(--accent)' }}>/media</code>.
                    </p>
                    <pre style={cleanSlatePre}>{`sudo rm -rf /media/cursor-workspace`}</pre>
                </div>
                <div style={cleanSlateStepBox}>
                    <div style={cleanSlateStepTitle}>3 — Recreate an empty mount point</div>
                    <p style={{ ...p, marginBottom: '6px', fontSize: '0.85rem' }}>Ready for path A (mount) or B (local tree) again.</p>
                    <pre style={cleanSlatePre}>{`sudo mkdir -p /media/cursor-workspace`}</pre>
                </div>
                <p style={{ ...p, marginBottom: '10px' }}>
                    Then follow <strong>either</strong> A <strong>or</strong> B — never pre-fill profile folders under <code style={{ color: 'var(--accent)' }}>/media/cursor-workspace</code> before an A mount on that same path. If A fails and you switch to B, run the clean slate block first.
                </p>
                <p style={{ ...p, marginBottom: '0.35rem' }}>
                    <strong>A) SMB — mount Windows profile tree (recommended default)</strong> — you run this in SSH. <code style={{ color: 'var(--accent)' }}>/media/cursor-workspace</code> must be <strong>empty</strong>. Set{' '}
                    <code style={{ color: 'var(--accent)' }}>WINDOWS_HOST</code>, <code style={{ color: 'var(--accent)' }}>SMB_USER</code>, <code style={{ color: 'var(--accent)' }}>SMB_PASS</code>, and <code style={{ color: 'var(--accent)' }}>APIUSER</code> (Unix user running Node — see below) in the first four lines; the <code style={{ color: 'var(--accent)' }}>sudo mount</code> command uses them automatically.
                </p>
                <p style={{ ...p, marginBottom: '8px', fontSize: '0.85rem', color: '#e3c450' }}>
                    <strong>Important:</strong> a bare <code style={{ color: 'var(--accent)' }}>sudo mount -t cifs //IP/Users /media/cursor-workspace</code> with <strong>no</strong>{' '}
                    <code style={{ color: 'var(--accent)' }}>-o …</code> often fails with misleading errors such as “cannot mount … read-only”. Always use the full option line (credentials, <code style={{ color: 'var(--accent)' }}>vers=3.0</code>, <code style={{ color: 'var(--accent)' }}>uid</code>/<code style={{ color: 'var(--accent)' }}>gid</code>).
                </p>
                <pre style={{ ...preBox, marginBottom: '10px', fontSize: '0.76rem', lineHeight: 1.45 }}>
                    {`# After clean slate: directory exists and is empty.
WINDOWS_HOST="WINDOWS_HOST_OR_IP"  # computer name or IP address
SMB_USER="YOUR_SMB_USER"  # email for Microsoft account
SMB_PASS="YOUR_SMB_PASS"  # Microsoft account password (may differ from PIN / everyday login)
APIUSER="LINUX_USER_RUNNING_NODE"  # Linux login name (user that runs Node)

sudo mount -t cifs "//\${WINDOWS_HOST}/Users" /media/cursor-workspace \\
  -o "username=\${SMB_USER},password=\${SMB_PASS},uid=$(id -u "$APIUSER"),gid=$(id -g "$APIUSER"),iocharset=utf8,file_mode=0640,dir_mode=0750,vers=3.0,noserverino"`}
                </pre>
                <p style={{ ...p, marginBottom: '10px' }}>
                    After a successful mount, <code style={{ color: 'var(--accent)' }}>YOUR_USERNAME</code> appears from the PC — you do <strong>not</strong> mkdir that folder before mounting. Unmount:{' '}
                    <code style={{ color: 'var(--accent)' }}>sudo umount /media/cursor-workspace</code>. You <strong>must</strong> still use Control Center{' '}
                    <strong>Step 1</strong> → <strong>Save path</strong> — the mount does not configure the backend by itself.
                </p>
                <p style={{ ...p, marginBottom: '0.35rem' }}>
                    <strong>B) No SMB</strong> — only local directories (you copy/rsync <code style={{ color: 'var(--accent)' }}>workspaceStorage</code> onto this host yourself). Do <strong>not</strong> run a CIFS mount on top of this path afterward.
                </p>
                <pre style={{ ...preBox, marginBottom: '10px' }}>
                    {`APIUSER="LINUX_USER_RUNNING_NODE"  # Linux login name (user that runs Node)
sudo mkdir -p /media/cursor-workspace/YOUR_USERNAME/AppData/Roaming/Cursor/User/workspaceStorage
sudo chown -R "$APIUSER:$APIUSER" /media/cursor-workspace`}
                </pre>
                <p style={{ ...p, marginBottom: '0.5rem' }}>
                    In the Control Center, <strong>Step 1</strong> → <strong>Save path</strong> (required; same profile placeholder):
                </p>
                <pre style={preBox}>
                    {`/media/cursor-workspace/YOUR_USERNAME/AppData/Roaming/Cursor/User/workspaceStorage`}
                </pre>
                <p style={{ ...p, marginBottom: 0 }}>
                    <strong>Important:</strong> path B alone does not create chat files — you must populate the directory. Path A uses live Windows files under the mount.
                </p>
            </div>

            <DocDetails title="Find APIUSER (Unix user running Node)" defaultOpen>
                <p style={p}>The <code style={{ color: 'var(--accent)' }}>chown</code> target must match this user.</p>
                <pre style={preBox}>
                    {`# While backend runs (change port if needed):
ps aux | grep node
ss -tlnp | grep 3000`}
                </pre>
                <p style={p}>
                    First column = username → use as <code style={{ color: 'var(--accent)' }}>APIUSER</code>. Run{' '}
                    <code style={{ color: 'var(--accent)' }}>id APIUSER</code> if you need numeric uid/gid (only for advanced SMB/fstab).
                </p>
            </DocDetails>

            <DocDetails title="Verify the path" defaultOpen>
                <pre style={preBox}>
                    {`ls -la /media/cursor-workspace/YOUR_USERNAME/AppData/Roaming/Cursor/User/workspaceStorage | head`}
                </pre>
                <p style={{ ...p, marginBottom: 0 }}>
                    If you later mount the Windows share on <code style={{ color: 'var(--accent)' }}>/media/cursor-workspace</code>,{' '}
                    <code style={{ color: 'var(--accent)' }}>findmnt /media/cursor-workspace</code> confirms the mount.
                </p>
            </DocDetails>

            <DocDetails title="NT_STATUS_LOGON_FAILURE — Windows rejects the SMB login" defaultOpen={false}>
                <p style={p}>
                    <code style={{ color: 'var(--accent)' }}>smbclient</code> or <code style={{ color: 'var(--accent)' }}>mount.cifs</code> shows this when the PC is reachable but <strong>network authentication</strong> fails — not a Linux mount-point problem.
                </p>
                <ul style={ul}>
                    <li>
                        <strong>PIN is not the SMB password.</strong> If you usually unlock Windows with a PIN, SMB still needs your <strong>Microsoft account password</strong> (or a separately configured Windows password). Set or reset it under Settings → Accounts → Sign-in options, or at{' '}
                        <code style={{ color: 'var(--accent)' }}>account.microsoft.com</code>.
                    </li>
                    <li>
                        <strong>Try other username shapes</strong> in <code style={{ color: 'var(--accent)' }}>-U</code> / <code style={{ color: 'var(--accent)' }}>username=</code>: full email; or <code style={{ color: 'var(--accent)' }}>COMPUTERNAME\shortname</code> (folder name under <code style={{ color: 'var(--accent)' }}>C:\Users</code>); or <code style={{ color: 'var(--accent)' }}>.\shortname</code>.
                    </li>
                    <li>
                        On the <strong>Windows</strong> PC: File and printer sharing on for the current network profile; password-protected sharing enabled; the <code style={{ color: 'var(--accent)' }}>Users</code> share (or path you use) allows that account.
                    </li>
                    <li>
                        Fix login with <code style={{ color: 'var(--accent)' }}>sudo apt install smbclient</code> and{' '}
                        <code style={{ color: 'var(--accent)' }}>smbclient //HOST/Users -U '…' -m SMB3</code> until an interactive session works (then <code style={{ color: 'var(--accent)' }}>ls</code>, <code style={{ color: 'var(--accent)' }}>quit</code>); use the same user/pass in <code style={{ color: 'var(--accent)' }}>mount -o</code>.
                    </li>
                </ul>
            </DocDetails>

            <DocDetails title="Security" defaultOpen={false}>
                <ul style={ul}>
                    <li>No secrets in git.</li>
                    <li>Trusted network / VPN; HTTPS to Control Center.</li>
                    <li>If you use fstab credentials files, keep them root-only and protect the host.</li>
                </ul>
            </DocDetails>

            <DocDetails title="Advanced (optional): SMB from Windows, /etc/fstab, in-UI mount" defaultOpen={false}>
                <p style={p}>
                    Use this only if you want fstab persistence or the in-UI “Mount” button. Path <strong>A</strong> in Step 0 already covers a normal one-shot{' '}
                    <code style={{ color: 'var(--accent)' }}>sudo mount -t cifs</code> in SSH.
                </p>

                <p style={{ ...p, marginBottom: '0.5rem' }}>
                    <strong>0. Three passwords (do not mix them up)</strong>
                </p>
                <ul style={ul}>
                    <li>
                        <strong>Linux login</strong> (SSH) — <strong>not</strong> the “Share password” in the UI.
                    </li>
                    <li>
                        <strong>SMB / Windows share password</strong> — what the Windows PC expects (often your Windows user password).
                    </li>
                    <li>
                        <strong>sudo</strong> — Linux password in the terminal when editing system files. The browser never sees it.
                    </li>
                </ul>

                <p style={{ ...p, marginBottom: '0.5rem' }}>
                    <strong>Error cheat sheet</strong>
                </p>
                <div style={tableWrap}>
                    <table style={table}>
                        <thead>
                            <tr>
                                <th style={th}>Symptom</th>
                                <th style={th}>Meaning</th>
                                <th style={th}>Where to fix</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={td}>
                                    <code style={{ color: 'var(--accent)' }}>EACCES</code> mkdir under <code style={{ color: 'var(--accent)' }}>/media</code>
                                </td>
                                <td style={td}>Node cannot create the mountpoint.</td>
                                <td style={td}>sudo mkdir + chown APIUSER.</td>
                            </tr>
                            <tr>
                                <td style={td}>
                                    <code style={{ color: 'var(--accent)' }}>must be superuser to use mount</code>
                                </td>
                                <td style={td}>Non-root cannot run mount.</td>
                                <td style={td}>fstab + mount -a, or run backend as root (avoid).</td>
                            </tr>
                            <tr>
                                <td style={td}>LOGON_FAILURE / bad UNC / host down</td>
                                <td style={td}>SMB or network issue.</td>
                                <td style={td}>Windows share, firewall, credentials.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p style={{ ...p, marginBottom: '0.5rem' }}>
                    <strong>Empty mountpoint before CIFS mounts on it</strong>
                </p>
                <p style={p}>
                    Defaults allow <code style={{ color: 'var(--accent)' }}>/media</code>, <code style={{ color: 'var(--accent)' }}>/mnt</code>,{' '}
                    <code style={{ color: 'var(--accent)' }}>/run/user/…</code> (see <code style={{ color: 'var(--accent)' }}>IDE_CAPTURE_SIMPLE_MOUNT_PREFIXES</code>).
                </p>
                <pre style={preBox}>
                    {`sudo mkdir -p /media/cursor-workspace
sudo chown APIUSER:APIUSER /media/cursor-workspace
sudo chmod 755 /media/cursor-workspace`}
                </pre>
                <p style={p}>Keep this directory empty until CIFS mounts on it.</p>

                <DocDetails title="Option A — sudoers (only if backend invokes sudo mount)" nested defaultOpen={false}>
                    <p style={p}>
                        The stock app calls <code style={{ color: 'var(--accent)' }}>mount</code> without <code style={{ color: 'var(--accent)' }}>sudo</code>.
                        Sudoers rules alone change nothing until code uses <code style={{ color: 'var(--accent)' }}>sudo /usr/bin/mount …</code>.
                    </p>
                    <pre style={{ ...preBox, fontSize: '0.78rem', lineHeight: 1.45 }}>
                        {`# Example pattern (tighten paths — run: which mount / which umount)
sudo visudo -f /etc/sudoers.d/ide-capture-cifs

APIUSER ALL=(root) NOPASSWD: /usr/bin/mount -t cifs *
APIUSER ALL=(root) NOPASSWD: /usr/bin/umount /media/cursor-workspace`}
                    </pre>
                </DocDetails>

                <DocDetails title="Option B — /etc/fstab + credentials" nested defaultOpen={false}>
                    <p style={p}>Mount as root at boot; use Step 1 in the Control Center for the Linux path only.</p>
                    <p style={p}>
                        <strong>1)</strong> Root-only credentials file (Windows SMB user):
                    </p>
                    <pre style={preBox}>
                        {`sudo install -m 600 /dev/null /root/.smb-cursor-credentials
sudo nano /root/.smb-cursor-credentials`}
                    </pre>
                    <ul style={ul}>
                        <li>
                            <code style={{ color: 'var(--accent)' }}>sudo</code> asks for your <strong>Linux</strong> password — <strong>not</strong> the
                            Windows share password.
                        </li>
                        <li>
                            <strong>GNU nano</strong> (e.g. 7.x): file may be empty at first. Microsoft account → <code style={{ color: 'var(--accent)' }}>username=</code>{' '}
                            often full email; local account → short name.
                        </li>
                    </ul>
                    <pre style={preBox}>
                        {`username=you@example.com
password=YOUR_WINDOWS_OR_MICROSOFT_ACCOUNT_PASSWORD
# domain=WORKGROUP   # uncomment only if required`}
                    </pre>
                    <ul style={ul}>
                        <li>
                            <strong>Save:</strong> <kbd style={kbd}>Ctrl+O</kbd> (letter <strong>O</strong>), <strong>Enter</strong>, then{' '}
                            <kbd style={kbd}>Ctrl+X</kbd>. <kbd style={kbd}>Ctrl+0</kbd> (zero) does not save.
                        </li>
                        <li>
                            If <kbd style={kbd}>Ctrl+X</kbd> does nothing: focus the terminal; after <kbd style={kbd}>Ctrl+O</kbd> press <strong>Enter</strong>; try an external terminal if the IDE steals keys; last resort{' '}
                            <code style={{ color: 'var(--accent)' }}>sudo killall nano</code> from a second SSH session.
                        </li>
                    </ul>
                    <p style={p}>
                        <strong>Before editing fstab:</strong> exit nano first — you cannot run shell commands from inside the editor. After{' '}
                        <kbd style={kbd}>Ctrl+X</kbd>, at the shell prompt run <code style={{ color: 'var(--accent)' }}>sudo nano /etc/fstab</code>.
                    </p>
                    <p style={p}>
                        <strong>2)</strong> Append one line to <code style={{ color: 'var(--accent)' }}>/etc/fstab</code> (replace HOST, SHARE, uid, gid):
                    </p>
                    <p style={p}>Wie du „hinkommst“: Datei mit Root-Rechten öffnen, z.&nbsp;B.:</p>
                    <pre style={preBox}>{`sudo nano /etc/fstab`}</pre>
                    <p style={p}>
                        (Mit den <strong>Pfeiltasten</strong> nach <strong>unten</strong>, <strong>neue Zeile</strong>, speichern wie oben:{' '}
                        <kbd style={kbd}>Ctrl+O</kbd>, <strong>Enter</strong>, <kbd style={kbd}>Ctrl+X</kbd>.)
                    </p>
                    <p style={p}>Optional vorher Backup:</p>
                    <pre style={preBox}>{`sudo cp /etc/fstab /etc/fstab.backup-vor-cursor`}</pre>
                    <pre style={{ ...preBox, fontSize: '0.72rem', lineHeight: 1.4 }}>
                        {`//WINDOWS_HOST/ShareName /media/cursor-workspace cifs credentials=/root/.smb-cursor-credentials,uid=1000,gid=1000,iocharset=utf8,file_mode=0640,dir_mode=0750,vers=3.0,noserverino 0 0`}
                    </pre>
                    <p style={p}>
                        Use numeric uid/gid from <code style={{ color: 'var(--accent)' }}>id APIUSER</code>.
                    </p>
                    <p style={p}>
                        <strong>3)</strong> Test:
                    </p>
                    <pre style={preBox}>
                        {`sudo mount -a
findmnt /media/cursor-workspace
ls /media/cursor-workspace`}
                    </pre>
                    <p style={{ ...p, marginBottom: 0 }}>
                        Then set e.g.{' '}
                        <code style={{ color: 'var(--accent)' }}>/media/cursor-workspace/YOUR_USERNAME/AppData/Roaming/Cursor/User/workspaceStorage</code> in Step 1.
                    </p>
                </DocDetails>

                <p style={{ ...p, marginBottom: '0.5rem' }}>
                    <strong>Browser / API simple mount</strong>
                </p>
                <p style={{ ...p, marginBottom: 0 }}>
                    The backend may still expose <code style={{ color: 'var(--accent)' }}>POST …/capture/mount/simple</code> for automation, but the
                    guided flow assumes you mount with <strong>Step 0</strong> in SSH (or fstab above). That endpoint runs{' '}
                    <code style={{ color: 'var(--accent)' }}>mount -t cifs</code> as the Node Unix user and is often blocked without fstab/sudo
                    changes — prefer the terminal commands in the green box.
                </p>
            </DocDetails>

            <DocDetails title="Related" defaultOpen={false}>
                <p style={{ ...p, marginBottom: 0 }}>
                    <code style={{ color: 'var(--accent)' }}>020_IDE_chat_capture_A070.md</code> in Studio Framework — capture overview.
                </p>
            </DocDetails>
        </DocMegaSection>
    );
}
