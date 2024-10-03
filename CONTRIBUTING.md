# Contributing

We would ❤️ for you to contribute to Odin-js and help make it better! All kinds of contributions are valuable to us. In this guide, we will cover how you can quickly onboard and make your first contribution.

## How to start?

If you are worried or don’t know where to start, check out our next section explaining what kind of help we could use and where can you get involved. You can reach out to us on our [Discord](<INSERT DISCORD LINK>) server if you have any questions or need help.

You can also submit an issue, and a maintainer can guide you!

## Submit a Pull Request 🚀

PR title naming convention is as following

`TYPE: DESCRIPTION`

Example:

```
doc: fix typo
```

Where `TYPE` can be:

- feat - is a new feature
- doc - documentation only changes
- cicd - changes related to CI/CD system
- fix - a bug fix
- refactor - code change that neither fixes a bug nor adds a feature

**All PRs must include a commit message with the changes description!**

For the initial start, fork the project and use git clone command to download the repository to your computer. A standard procedure for working on an issue would be to:

1. `git pull`, before creating a new branch, pull the changes from upstream. Your main needs to be up to date.

```bash
$ git pull
```

2. Create new branch from `main` like: `fix-typo`. You can name your branch as you like

```bash
$ git checkout -b fix-typo
```

3. Work - commit - repeat (be sure to be in your branch)

4. Push changes to GitHub

```bash
$ git push origin [name_of_your_new_branch]
```

5. Submit your changes for review If you go to your repository on GitHub, you'll see a Compare & pull request button. Click on that button.

6. Start a Pull Request Now submit the pull request and click on `Create pull request`.

7. Get a code review approval/reject

## Submitting an issue

Before submitting a new issue, please search the existing [issues](https://github.com/homebase-id/odin-js/issues). Maybe an issue already exists and might inform you of workarounds. Otherwise, you can give new information.

While we want to fix all the [issues](https://github.com/homebase-id/odin-js/issues), before fixing a bug we need to be able to reproduce and confirm it. Please provide us with a minimal reproduction scenario using a repository or [Gist](https://gist.github.com/).

Without said minimal reproduction, we won't be able to investigate all [issues](https://github.com/homebase-id/odin-js/issues), and the issue might not be resolved.

You can open a new issue with this [issue form](https://github.com/homebase-id/odin-js/issues/new).
