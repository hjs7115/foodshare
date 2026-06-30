Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

git subtree pull --prefix=backend backend main --squash
