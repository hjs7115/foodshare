Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

git subtree pull --prefix=frontend frontend main --squash
