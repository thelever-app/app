# Contributing to TheLever

Thanks for your interest in TheLever. This repository is licensed under the
[GNU Affero General Public License v3.0](LICENSE). By contributing, you agree
that your contribution is licensed under the same terms.

## Developer Certificate of Origin (DCO)

We do not use a Contributor License Agreement. Instead, every commit must be
signed off under the [Developer Certificate of Origin](https://developercertificate.org/),
certifying that you wrote the change or otherwise have the right to submit it
under this project's license.

Sign off by adding this line at the end of each commit message, using your real
name and an email associated with your GitHub account:

```
Signed-off-by: Jane Doe <jane@example.com>
```

Git adds it for you with the `-s` flag:

```sh
git commit -s -m "feat(engine): add decision phase timer"
```

Pull requests are checked automatically. If a commit is missing the sign-off,
the DCO check fails and the pull request cannot be merged.

### Fixing a missing sign-off

For the last commit:

```sh
git commit --amend --no-edit -s
git push --force-with-lease
```

For every commit in your branch:

```sh
git rebase --signoff main
git push --force-with-lease
```

Commits made through the GitHub web editor must be signed off too; GitHub adds
the line when you confirm the commit.
