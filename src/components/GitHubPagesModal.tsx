import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, Globe, Github } from 'lucide-react';

interface GitHubPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubPagesModal: React.FC<GitHubPagesModalProps> = ({ isOpen, onClose }) => {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const actionYaml = `name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: |
          if [ -f package-lock.json ]; then
            npm ci --legacy-peer-deps
          else
            npm install --legacy-peer-deps
          fi

      - name: Build static web app
        run: npm run build

      - name: Setup GitHub Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gh-pages-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-lg bg-[#fff9ee] border-2 border-[#7a1215] rounded-[28px] shadow-2xl p-6 max-h-[90vh] overflow-y-auto text-amber-950">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-amber-900/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#7a1215] text-amber-200 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 id="gh-pages-title" className="text-xl font-bold text-[#7a1215] font-spiritual">
                GitHub Pages Ready
              </h2>
              <p className="text-xs text-amber-800">
                100% Client-Side · Relative Asset Paths · Zero External Dependencies
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-amber-900 hover:bg-amber-900/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Checkmarks */}
        <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-emerald-950">
            <Check className="w-4 h-4 text-emerald-600" />
            Configured for any GitHub Pages subpath:
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed pl-5">
            • <code className="bg-emerald-100 px-1 py-0.5 rounded">base: './'</code> is configured in <code className="bg-emerald-100 px-1 py-0.5 rounded">vite.config.ts</code> so all assets resolve correctly regardless of repo name or domain.
            <br />
            • Web Audio API soundscapes are synthesized procedurally in the browser — no missing external audio assets or CORS issues.
          </p>
        </div>

        {/* Quick Instructions */}
        <div className="mt-4 space-y-3 text-xs">
          <h3 className="font-bold text-[#7a1215] uppercase tracking-wider">
            How to Deploy to GitHub Pages (2 Easy Ways)
          </h3>

          {/* Option A: GitHub Actions (Recommended) */}
          <div className="p-3 bg-white rounded-xl border border-amber-200">
            <div className="font-semibold text-amber-900 flex items-center justify-between">
              <span>Option 1: Automatic GitHub Action (Recommended)</span>
              <button
                type="button"
                onClick={() => handleCopy(actionYaml, 'action')}
                className="text-[11px] text-[#7a1215] font-bold hover:underline flex items-center gap-1"
              >
                {copiedStep === 'action' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedStep === 'action' ? 'Copied YAML!' : 'Copy Workflow'}
              </button>
            </div>
            <p className="text-amber-800/80 text-[11px] mt-1">
              The workflow file <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.github/workflows/deploy.yml</code> is already created and included in this repo. Simply push your code to GitHub, then in your repository settings go to <strong>Settings → Pages → Source: GitHub Actions</strong>.
            </p>
          </div>

          {/* Option B: npm run build & gh-pages */}
          <div className="p-3 bg-white rounded-xl border border-amber-200">
            <div className="font-semibold text-amber-900 flex items-center justify-between">
              <span>Option 2: Direct Build & Deploy</span>
              <button
                type="button"
                onClick={() => handleCopy('npm run build\nnpx gh-pages -d dist', 'build')}
                className="text-[11px] text-[#7a1215] font-bold hover:underline flex items-center gap-1"
              >
                {copiedStep === 'build' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedStep === 'build' ? 'Copied Command!' : 'Copy Command'}
              </button>
            </div>
            <pre className="bg-amber-100/60 p-2 rounded text-[11px] font-mono text-amber-950 mt-1 overflow-x-auto">
              npm run build{'\n'}npx gh-pages -d dist
            </pre>
            <p className="text-amber-800/80 text-[11px] mt-1">
              Builds the static bundle into <code className="bg-amber-100 px-1 py-0.5 rounded">/dist</code> and deploys directly to your <code className="bg-amber-100 px-1 py-0.5 rounded">gh-pages</code> branch.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-amber-900/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-[#7a1215] hover:bg-[#92181c] rounded-full shadow transition-all"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
