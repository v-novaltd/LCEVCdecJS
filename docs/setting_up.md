# Setting up Build Environment

The instructions for setting up your environment may differ depending on which OS you are using, but they all have basic dependencies:

- Git
- Python (3.7 or above)
- NodeJS (12 or above)

Take the following steps in order to install these dependencies.

## Linux

### Installing Git

Via apt or a package manager in your distribution:

```bash
sudo apt install git
```

### Installing Python (3.7 or above)

Via apt or a package manager in your distribution. It is recommended to also install
venv support.

```bash
sudo apt install python3 python3-venv
```

### Installing NodeJS

Via bash script and apt or a package manager in your distro. It is also recommended to
install the last LTS.

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Windows

### Installing Git

NodeJs for Windows is available for download
[here](https://git-scm.com/download/win).

### Installing Python 3.7

Python for Windows is available for download
[here](https://www.python.org/downloads/windows/). You should use version 3.7 or
greater. Follow the installation instructions and add installed location to
**Path** for it be found by other tools.

Good instructions on how to install Python virtual environments on Windows
machine are available
[here](https://docs.python.org/3/tutorial/venv.htm)

### Installing NodeJS

NodeJs for Windows is available for download
[here](https://nodejs.org/en/download/). It is recommended to install the LTS
version.
