# Git Authentication Setup Guide

## ✅ Completed Configuration

The following Git authentication providers have been enabled:

1. **Windows Credential Manager (manager-core)** - Main credential helper
2. **GitHub Authentication** - Configured for `github.com`
3. **GitLab Authentication** - Configured for `gitlab.com`
4. **Git Repository** - Initialized in the project

## 🔧 Required Configuration

### Step 1: Set Your Git User Information

You need to configure your name and email for Git commits:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**Or set them locally for this repository only:**
```powershell
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Step 2: Verify Configuration

Check your current Git configuration:
```powershell
git config --global --list
```

## 🔐 Authentication Methods

### For GitHub/GitLab (HTTPS)

When you push or pull from GitHub/GitLab for the first time:
1. Git will prompt for your credentials
2. Windows Credential Manager will store them securely
3. Future operations will use saved credentials automatically

### For SSH Authentication (Alternative)

If you prefer SSH instead of HTTPS:

1. **Generate SSH Key:**
   ```powershell
   ssh-keygen -t ed25519 -C "your.email@example.com"
   ```

2. **Add SSH key to SSH agent:**
   ```powershell
   Start-Service ssh-agent
   ssh-add ~/.ssh/id_ed25519
   ```

3. **Copy public key to clipboard:**
   ```powershell
   Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard
   ```

4. **Add to GitHub/GitLab:**
   - GitHub: Settings → SSH and GPG keys → New SSH key
   - GitLab: Preferences → SSH Keys → Add SSH Key

5. **Update remote URL to use SSH:**
   ```powershell
   git remote set-url origin git@github.com:username/repository.git
   ```

## 📝 Current Git Credential Configuration

```powershell
credential.helper=manager-core
credential.https://github.com.helper=manager-core
credential.https://gitlab.com.helper=manager-core
```

## 🔍 Verify Authentication Setup

1. **Check credential helper:**
   ```powershell
   git config --global credential.helper
   ```

2. **Test authentication (when connecting to remote):**
   ```powershell
   git ls-remote origin
   ```

## 📚 Useful Commands

- **View stored credentials:** Windows Credential Manager (Windows Key → "Credential Manager")
- **Clear cached credentials:** `git credential reject https://github.com`
- **List all Git config:** `git config --global --list`
- **View repository config:** `git config --local --list`

## ⚠️ Notes

- Windows Credential Manager stores credentials securely in the Windows Vault
- Credentials are automatically used for future Git operations
- You can manage stored credentials through Windows Credential Manager
- If authentication fails, check that you have proper access rights to the repository

## 🚀 Next Steps

1. Set your user name and email (see Step 1 above)
2. Add a remote repository:
   ```powershell
   git remote add origin https://github.com/username/repository.git
   ```
3. Make your first commit and push:
   ```powershell
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```
