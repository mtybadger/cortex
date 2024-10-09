# Cortex

Cortex is an open-source fork of VSCode focused on using AI to help academic work, à la [Cursor](https://www.cursor.com/). This repo is the core fork of VSCode, which you should be able to drop into a build pipeline like [VSCodium](https://github.com/VSCodium/vscodium/tree/master) to build it yourself, as I do. 

## Installation 

The easiest and fastest way to install is on [the Cortex website](https://cortexedit.com/).

## Codebase

The main objects of interest here are the extensions: `cortex-templates`, `cortex-cite`, `cortex-chat` (forked from [continuedev/continue](https://github.com/continuedev/continue)) and `latex-workshop` (forked from [James-Yu/LaTeX-Workshop](https://github.com/James-Yu/LaTeX-Workshop)`). All of these projects deserve all the stars! Additionally, I've messed with getting started and welcome pages, the quick chat functionality to enable Cmd+K, and installed a modified version of the [Serendipity themes](https://github.com/serendipity-theme) by default.

I'm accepting issues, and PRs if you're really into it, but I'll make the codebase more accessible to others in the future if that's something people want.

## License

Licensed under the [MIT](LICENSE.txt) license.
