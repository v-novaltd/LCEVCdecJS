# Setting up Build Environment

Instructions for setting up your environment may be different depending on which OS you are using, but they all have basic dependencies:

- git
- python (3.7 or above)
- nodejs (12 or above)

Following are steps to take in order to get these dependencies installed.

## Linux

### Installing Git

Via apt or a package manager in your distro:

```bash
sudo apt install git
```

### Installing Python (3.7 or above)

Via apt or a package manager in your distro. Recommendation is to also install
venv support.

```bash
sudo apt install python3 python3-venv
```

### Installing NodeJS

Via bash script and apt or a package manager in your distro. Recomendation is to
install the last LTS.

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Windows

### Installing git

NodeJs for Windows is available for download
[here](https://git-scm.com/download/win).

### Installing python 3.7

Python for Windows is available for download
[here](https://www.python.org/downloads/windows/). You should use version 3.7 or
greater. Follow the installation instructions and add installed location to
**Path** for it be found by other tools.

Good instructions on how to install Python virtual environments on Windows
machine are available
[here](http://timmyreilly.azurewebsites.net/python-pip-virtualenv-installation-on-windows/)

### Installing NodeJS

NodeJs for Windows is available for download
[here](https://nodejs.org/en/download/). Recomendation is to install the LTS
version.
