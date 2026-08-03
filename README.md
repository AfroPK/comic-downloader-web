<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/AfroPK/comic-downloader-web">
    
  </a>

  <h3 align="center">Comic Downloader Web</h3>

  <p align="center">
    A local-only web application for downloading comics as clean CBZ archives.
    <br />
    <a href="https://github.com/AfroPK/comic-downloader-web"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/AfroPK/comic-downloader-web">View Demo</a>
    &middot;
    <a href="https://github.com/AfroPK/comic-downloader-web/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/AfroPK/comic-downloader-web/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

**Comic Downloader Web** is a local-only web app for downloading comics as clean CBZ archives. It uses **Node.js, Express, Puppeteer, React 18, and Vite** to scrape and package comic chapters locally on your machine.

> ⚠️ **Site support:** Currently **`batcave`** is the only fully supported site.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

[![React][React.js]][React-url]
* [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=nodedotjs&logoColor=white)][node-url]
* [![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)][express-url]
* [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)][vite-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

* **Node.js (v18 or higher)** and npm
* **Google Chrome, Microsoft Edge, or Brave Browser** installed (required for Puppeteer headless scraping and anti-bot evasion)
* **Site support:** Currently **`batcave`** is the only fully supported site

### Installation

1. Set your allowed target sites in `backend/.env`. **No websites are allowed by default.**
```env
PORT=3000
TARGET_SITES=https://example-comic-site.com
```
2. Install dependencies (first time only):
* **Windows:** run `setup.bat`
* **Linux / macOS:** run `./setup.sh`
3. Launch the app:
* **Windows:** run `run.bat`
* **Linux / macOS:** run `./run.sh`

This starts the Express backend (`http://localhost:3000`) and the Vite React frontend (`http://localhost:5173`).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

1. Open `http://localhost:5173` in your browser.
2. Paste the full URL of the comic you want to download (e.g. `https://example-comic-site.com/comic-name`).
3. Click **Download** and wait for chapters/metadata to load.
4. Select individual chapters to download as `.cbz`, or click **Download Full Comic`** to compile everything into a single master `.zip` with a summary report.

### Troubleshooting
* **"URL not allowed"** — add the domain to `TARGET_SITES` in `backend/.env`.
* **"Puppeteer cannot launch"** — ensure Chrome/Edge/Brave is installed. If custom-located, set `PUPPETEER_EXECUTABLE_PATH` in `backend/.env`.

> **Disclaimer:** For personal and educational use only. Respect the terms of service of any site you access.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [ ] Add more features
- [ ] Improve documentation

See the [open issues](https://github.com/AfroPK/comic-downloader-web/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement". Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

AfroPK - [@AfroPK](https://github.com/AfroPK)

Project Link: [https://github.com/AfroPK/comic-downloader-web](https://github.com/AfroPK/comic-downloader-web)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)
* [Img Shields](https://shields.io/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/AfroPK/comic-downloader-web.svg?style=for-the-badge
[contributors-url]: https://github.com/AfroPK/comic-downloader-web/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/AfroPK/comic-downloader-web.svg?style=for-the-badge
[forks-url]: https://github.com/AfroPK/comic-downloader-web/network/members
[stars-shield]: https://img.shields.io/github/stars/AfroPK/comic-downloader-web.svg?style=for-the-badge
[stars-url]: https://github.com/AfroPK/comic-downloader-web/stargazers
[issues-shield]: https://img.shields.io/github/issues/AfroPK/comic-downloader-web.svg?style=for-the-badge
[issues-url]: https://github.com/AfroPK/comic-downloader-web/issues
[license-shield]: https://img.shields.io/github/license/AfroPK/comic-downloader-web.svg?style=for-the-badge
[license-url]: https://github.com/AfroPK/comic-downloader-web/blob/master/LICENSE.txt
[Shell]: https://img.shields.io/badge/Shell-4EAA25?style=for-the-badge&logo=gnubash&logoColor=white
[Shell-url]: https://www.gnu.org/software/bash/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[node-url]: https://nodejs.org/
[express-url]: https://expressjs.com/
[vite-url]: https://vitejs.dev/
[xdotool-url]: https://github.com/jordansissel/xdotool
[wlr-url]: https://sr.ht/~emersion/wlr-randr/
[zenity-url]: https://wiki.gnome.org/Projects/Zenity
[python-url]: https://www.python.org/
[pyqt-url]: https://www.riverbankcomputing.com/software/pyqt/
