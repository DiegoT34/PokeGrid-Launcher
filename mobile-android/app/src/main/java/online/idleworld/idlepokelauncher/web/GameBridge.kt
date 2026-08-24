package online.idleworld.idlepokelauncher.web

import android.webkit.JavascriptInterface

class GameBridge(private val onEvent: (String, String) -> Unit) {
    @JavascriptInterface
    fun emit(kind: String, payload: String) = onEvent(kind.take(40), payload.take(250_000))
}
