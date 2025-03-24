{
  title: "Backing up GitHub with my Synology NAS",
  date:  "2025-03-24",
  description: "How I used GitHub CLI, Homebrew, and some shell scripts to automate backing up GitHub on my synology",
  type: "blog"
}
### What did I want to do?

I wanted to automate the backup of my GitHub repostiories locally on my synology. There were no off the shelf solutions so I figured I should be able to do this easily by leveraging the GitHub CLI and some shell script tasks. This lead to the first challenge, how do I get GitHub CLI on Synology easily? As the synology doesn't have a great package manager off the shelf, and I'd heard great things about linux support for homebrew, I decided "why not"!

### Installing Homebrew and GitHub CLI on Synology

Kudos to Carlos Álvaro for [this excellent blog post](https://cdalvaro.io/2025/02/02/synogoly_homebrew) on installing homebrew on synology. There are some small gotchas but overall it worked great.

1. Mount `/volume1/homes` as `/homes` via `mount -o bind /volume1/homes /home` and create a [Synology Task](https://kb.synology.com/en-af/DSM/help/DSM/AdminCenter/system_taskscheduler?version=7) that runs this command on boot
2. Make a linuxbrew directory via `sudo mkdir -m 755 /home/linuxbrew`
3. Ensure git is installed via SynoCommunity package
4. Make a mock `/usr/bin/ldd` binary (see blog post)
5. Make a mock `/etc/os-release` binary (see blog post)

With all the above done I ran the documented 1-liner for homebrew and it "just worked"™️.

After this I simply needed to run `brew install gh` and I was ready to go. Of course I played around a bit and got `zsh`, `oh-my-zsh`, and `p10k` installed too so my shell could ✨shine✨

### Write one off bash scripts to download GitHub packages

Next up I wanted to capture all of my repos into a folder to start. I found a great solution to this [on stackoverflow](https://stackoverflow.com/a/68770988) from user [RichVel](https://stackoverflow.com/users/992887/richvel). I made some tweaks, specifically I wanted to capture forks in a different folder from my person work.

`copy-github.sh`
```bash
gh repo list $USERNAME --source --limit 4000 | while read -r repo _; do
  gh repo clone "$repo" "$repo"
done
```

`copy-github-forks.sh`

```bash
gh repo list $USERNAME --fork --limit 4000 | while read -r repo _; do
  forks=$(echo $repo | sed 's/$USERNAME/forks/')
  gh repo clone "$repo" "$forks"
done
```
### Automating updates

Now that I had a local copy of all my repositories I wanted to automate updating them, so I created two new scripts inspired by the same stack overflow thread as mentioned above

`update-github.sh`
```bash
gh repo list $USERNAME --source  --limit 1000 | while read -r repo _; do
  gh repo clone "$repo" "$repo" -- -q 2>/dev/null || (
    cd "$repo"
	echo "Updating $repo"
    # Handle case where local checkout is on a non-main/master branch
    # - ignore checkout errors because some repos may have zero commits,
    # so no main or master
    git checkout -q main 2>/dev/null || true
    git checkout -q master 2>/dev/null || true
    git remote update -p
	git pull
  )
done
```

`update-github-forks.sh`
```bash
gh repo list $USERNAME --fork --limit 1000 | while read -r repo _; do
  forks=$(echo $repo | sed 's/$USERNAME/forks/')
  echo "Checking $repo"
  gh repo clone "$repo" "$forks" -- -q 2>/dev/null || (
    cd "$forks"
    echo "Updating $repo"
    # Handle case where local checkout is on a non-main/master branch
    # - ignore checkout errors because some repos may have zero commits,
    # so no main or master
    git checkout -q main 2>/dev/null || true
    git checkout -q master 2>/dev/null || true
    git remote update -p
    git pull -q
  )
done
```

The above scripts iterate across all repos, if there are new repos they will be clones. For existing repos it will update all branches and pull the state into the currently tracked branch. A fun side effect of using `gh` to clone the repos is that they track the upstream remote. Leveraging `git remote update -p` ensures that I keep an up to date copy of all branches on the upstream of the fork, nifty!

From here I made a new [Synology Task](https://kb.synology.com/en-af/DSM/help/DSM/AdminCenter/system_taskscheduler?version=7) to run the following script daily with my personal user account

```bash
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)" # setup homebrew in path
cd /volume1/Backup/GitHub
~/scripts/update-github.sh
~/scripts/update-github-forks.sh
```

Now I am able to sleep comfortably knowing all my work on GitHub is being stored locally with the redundnacy of [Synology Hybrid Raid](https://kb.synology.com/vi-vn/DSM/tutorial/What_is_Synology_Hybrid_RAID_SHR).
