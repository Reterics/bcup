# 🚀 Contribution Guide

Thank you for your interest in contributing to **B Cup**! This guide will help you set up your environment, follow our coding standards, and understand our Git commit conventions.

---

## 🛠 Setting Up Your Development Environment

1. **Fork the Repository** on GitHub.
2. **Clone Your Fork** to your local machine:
   ```sh
   git clone https://github.com/your-username/b-cup.git
   cd b-cup
   ```
3. **Install Dependencies**:
   ```sh
   composer install
   ```
4. **Create a Branch for Your Work**:
   ```sh
   git checkout -b feature/your-feature
   ```

---

## 📌 Git Commit Conventions

We follow the **Conventional Commits** standard to keep a clean and readable Git history. Please use the following format:

```sh
<type>(<scope>): <short description>

[Optional longer description]

[Optional footer]
```

### ✅ **Allowed Commit Types**
| Type      | Description |
|-----------|------------|
| `feat`    | Introduces a new feature |
| `fix`     | Fixes a bug |
| `docs`    | Documentation changes |
| `style`   | Code style updates (formatting, missing semicolons, etc.) |
| `refactor`| Code refactoring without changing functionality |
| `perf`    | Performance improvements |
| `test`    | Adds or updates tests |
| `chore`   | Maintenance tasks (build tools, dependency updates) |
| `ci`      | Continuous integration changes |

### ✅ **Commit Message Examples**
- **Feature Commit:**
  ```sh
  feat(backup): add automatic daily backup scheduling
  ```
- **Bug Fix Commit:**
  ```sh
  fix(restore): resolve issue with incorrect file parsing
  ```
- **Documentation Commit:**
  ```sh
  docs(readme): update setup instructions
  ```

---

## 🔥 Submitting a Pull Request

1. **Push your branch** to GitHub:
   ```sh
   git push origin feature/your-feature
   ```
2. **Open a Pull Request**:
    - Go to the GitHub repository.
    - Click **New Pull Request**.
    - Provide a clear description of your changes.
3. **Wait for Review**: A maintainer will review your PR and provide feedback if needed.
4. **Merge Your PR**: Once approved, your PR will be merged into `main`.

---

## 💡 Additional Guidelines

- Follow the **PSR-12 coding standard** for PHP.
- Write **clear and concise code** with comments where necessary.
- Ensure all tests pass before submitting a PR.
- Keep commits atomic and **avoid large commits** that do multiple things at once.

---

Thank you for contributing to **B Cup**! ☕🚀

