extends Node
## Autoload added by steam-kit. Starts Steam if GodotSteam is present and pumps its
## callbacks. The game keeps running without Steam (editor, itch builds, tests).
## Other scripts: `SteamBootstrap.enabled`, `SteamBootstrap.steam` (the Steam singleton).

## Written by `steam-kit export` from steam/steam.json. 480 is Valve's test app.
const APP_ID := 480

var enabled := false
var steam: Object = null


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	if not Engine.has_singleton("Steam"):
		print("[steam] GodotSteam not loaded, running without Steam")
		return
	steam = Engine.get_singleton("Steam")
	# A release build started outside Steam relaunches through Steam, so ownership
	# and the overlay work. Skipped for the test app and in debug builds.
	if APP_ID != 480 and not OS.is_debug_build() and steam.restartAppIfNecessary(APP_ID):
		get_tree().quit()
		return
	var result: Dictionary = steam.steamInitEx(APP_ID, false)
	print("[steam] init: %s" % result)
	enabled = result.get("status", 1) == 0


func _process(_delta: float) -> void:
	if enabled:
		steam.run_callbacks()


## Unlocks an achievement by its API name and pushes it to Steam right away.
func unlock(achievement: String) -> void:
	if enabled:
		steam.setAchievement(achievement)
		steam.storeStats()
