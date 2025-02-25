# GitHub Actions Deployment SSH Fix

## Problem
The GitHub Actions deployment workflow was failing with "Permission denied (publickey)" errors when trying to connect to the server.

## Investigation
1. Generated a new ED25519 key pair:
```bash
ssh-keygen -t ed25519 -C "github-actions" -f /tmp/github_actions_key -N ""
```

2. Public key:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDoAL3RB2hM9hlA0M1wGE3ARaKGUReSgYfTUu/rgSYJg github-actions
```

## Solution Steps

### 1. Server Setup
- Added the public key to server's authorized_keys:
```bash
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDoAL3RB2hM9hlA0M1wGE3ARaKGUReSgYfTUu/rgSYJg github-actions" >> ~/.ssh/authorized_keys
```

### 2. GitHub Configuration
1. Added the private key to GitHub secrets as `DEPLOY_SSH_KEY`
2. Added the public key to GitHub deploy keys with write access

### 3. Workflow Changes
1. Fixed the SSH key setup in `.github/workflows/deploy.yml`:
   - Properly writing the key from secrets
   - Setting correct permissions
   - Using explicit `-i` flag for SSH commands

```yaml
- name: Setup SSH Key
  run: |
    mkdir -p ~/.ssh
    # Write key directly (already has BEGIN/END markers)
    echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa
    # Start agent
    eval $(ssh-agent -s)
    DISPLAY=":0.0" SSH_ASKPASS=/bin/false ssh-add ~/.ssh/id_rsa

- name: Deploy to Server
  run: |
    # Test connection first
    ssh -v -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no root@170.64.223.56 'echo "SSH connection successful"' || exit 1
    # Then proceed with deployment
    ssh -v -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no root@170.64.223.56 '
      cd /var/www/lutruwita2
      git pull
      npm install
      SKIP_TYPESCRIPT=true npm run build
      cd server && npm install && SKIP_TYPESCRIPT=true npm run build && cd ..
      cp .env.production server/.env
      pm2 restart all
    '
```

### 4. Repository Setup
- Cloned fresh repository on server:
```bash
rm -rf /var/www/lutruwita2
git clone https://github.com/vinmasci/lutruwita2-next.git /var/www/lutruwita2
```

- Installed TypeScript globally:
```bash
npm install -g typescript
```

## Testing
1. Made changes to workflow file
2. Pushed changes to trigger workflow
3. Monitored deployment at: https://github.com/vinmasci/lutruwita2-next/actions

## Key Components
- **Private Key**: Stored in GitHub secrets as `DEPLOY_SSH_KEY`
- **Public Key**: Added to:
  1. Server's authorized_keys
  2. GitHub deploy keys
- **Workflow**: Uses `-i` flag to explicitly specify key file
