package online.idleworld.idlepokelauncher

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.DragEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import online.idleworld.idlepokelauncher.data.Account
import online.idleworld.idlepokelauncher.data.SecureAccountStore
import online.idleworld.idlepokelauncher.notifications.NotificationHelper
import online.idleworld.idlepokelauncher.web.GameBridge
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    companion object {
        private const val GAME_URL = "https://poke.idleworld.online/login"
        private const val PREFS = "mobile_layout_v1"
    }

    private data class SessionPanel(
        val index: Int,
        val root: View,
        val bar: View,
        val name: TextView,
        val status: TextView,
        val webView: WebView
    )

    private lateinit var grid: GridLayout
    private lateinit var accountStore: SecureAccountStore
    private lateinit var notifier: NotificationHelper
    private var accounts = List(4) { Account(label = "Cuenta ${it + 1}") }
    private var order = mutableListOf(0, 1, 2, 3)
    private var visible = mutableSetOf(0, 1, 2, 3)
    private var expanded: Int? = null
    private val panels = mutableMapOf<Int, SessionPanel>()
    private val latestSnapshots = mutableMapOf<Int, JSONObject>()
    private val seenEvents = mutableSetOf<String>()
    private lateinit var monitorScript: String
    private val pollHandler = Handler(Looper.getMainLooper())
    private val pollSnapshots = object : Runnable {
        override fun run() {
            panels.keys.filter { it in visible }.forEach(::requestSnapshot)
            pollHandler.postDelayed(this, 4_000)
        }
    }

    private val notificationPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) {}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        hideSystemBars()
        setContentView(R.layout.activity_main)
        accountStore = SecureAccountStore(this)
        notifier = NotificationHelper(this)
        accounts = accountStore.load()
        monitorScript = assets.open("mobile-monitor.js").bufferedReader().use { it.readText() }
        loadLayoutState()
        grid = findViewById(R.id.sessionGrid)
        ensureMultiProfileSupport()
        bindToolbar()
        buildSessions()
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val panel = expanded?.let(panels::get) ?: order.firstNotNullOfOrNull { panels[it]?.takeIf { p -> p.index in visible } }
                when {
                    expanded != null -> { expanded = null; applyGridLayout() }
                    panel?.webView?.canGoBack() == true -> panel.webView.goBack()
                    else -> { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
                }
            }
        })
        pollHandler.postDelayed(pollSnapshots, 4_000)
        if (android.os.Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).run {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    private fun ensureMultiProfileSupport() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
            AlertDialog.Builder(this)
                .setTitle("WebView debe actualizarse")
                .setMessage("El modo multicuentas requiere Android System WebView con perfiles aislados. Actualízalo desde Play Store; la app no mezclará las cookies de tus cuentas.")
                .setPositiveButton("Entendido", null)
                .show()
        }
    }

    private fun bindToolbar() {
        findViewById<Button>(R.id.accountsButton).setOnClickListener { showAccountsDialog() }
        findViewById<Button>(R.id.viewModeButton).setOnClickListener { showViewModeDialog() }
        findViewById<Button>(R.id.reloadButton).setOnClickListener { panels.values.filter { it.index in visible }.forEach { it.webView.reload() } }
        findViewById<Button>(R.id.notificationsButton).setOnClickListener { showEventHistory() }
        findViewById<Button>(R.id.farmButton).setOnClickListener { showFarmCenter() }
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    private fun buildSessions() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
            createSession(0)
            visible = mutableSetOf(0)
        } else order.forEach(::createSession)
        applyGridLayout()
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    private fun createSession(index: Int) {
        if (panels.containsKey(index)) return
        val root = LayoutInflater.from(this).inflate(R.layout.view_session_panel, grid, false)
        val bar = root.findViewById<View>(R.id.panelBar)
        val name = root.findViewById<TextView>(R.id.accountName)
        val status = root.findViewById<TextView>(R.id.accountStatus)
        val webView = root.findViewById<WebView>(R.id.gameWebView)
        name.text = accounts[index].label.ifBlank { "Cuenta ${index + 1}" }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)) {
            WebViewCompat.setProfile(webView, "idle-poke-account-${index + 1}")
        }
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            builtInZoomControls = true
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            userAgentString = userAgentString.replace("; wv", "").replace(" Mobile", "")
        }
        webView.setBackgroundColor(Color.rgb(17, 19, 21))
        webView.addJavascriptInterface(GameBridge { kind, payload -> runOnUiThread { onGameEvent(index, kind, payload) } }, "IdlePoke")
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(webView, monitorScript, setOf("https://poke.idleworld.online"))
        }
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                val trusted = uri.scheme == "https" && (uri.host == "poke.idleworld.online" || uri.host?.endsWith(".idleworld.online") == true)
                if (trusted) return false
                if (uri.scheme == "http" || uri.scheme == "https") {
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                }
                return true
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                status.text = "Cargando…"
                if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) view?.evaluateJavascript(monitorScript, null)
            }
            override fun onPageFinished(view: WebView, url: String) {
                status.text = "Sesión disponible"
                view.evaluateJavascript(monitorScript, null)
                injectLogin(index, view)
                requestSnapshot(index)
            }
        }
        val panel = SessionPanel(index, root, bar, name, status, webView)
        panels[index] = panel
        root.findViewById<Button>(R.id.reloadPanelButton).setOnClickListener { webView.reload() }
        root.findViewById<Button>(R.id.expandButton).setOnClickListener {
            expanded = if (expanded == index) null else index
            applyGridLayout()
        }
        root.findViewById<Button>(R.id.profileButton).setOnClickListener { showSnapshot(index, "profile") }
        root.findViewById<Button>(R.id.captureButton).setOnClickListener { showSnapshot(index, "captures") }
        root.findViewById<Button>(R.id.huntButton).setOnClickListener { showSnapshot(index, "hunt") }
        bindReorder(panel)
        webView.loadUrl(GAME_URL)
    }

    private fun bindReorder(panel: SessionPanel) {
        panel.bar.setOnLongClickListener {
            it.startDragAndDrop(ClipData.newPlainText("account", panel.index.toString()), View.DragShadowBuilder(it), panel.index, 0)
            true
        }
        panel.root.setOnDragListener { view, event ->
            when (event.action) {
                DragEvent.ACTION_DRAG_ENTERED -> { view.alpha = .72f; true }
                DragEvent.ACTION_DRAG_EXITED -> { view.alpha = 1f; true }
                DragEvent.ACTION_DROP -> {
                    view.alpha = 1f
                    val source = event.localState as? Int ?: return@setOnDragListener false
                    reorder(source, panel.index)
                    true
                }
                DragEvent.ACTION_DRAG_ENDED -> { view.alpha = 1f; true }
                else -> true
            }
        }
    }

    private fun reorder(source: Int, target: Int) {
        val from = order.indexOf(source)
        val to = order.indexOf(target)
        if (from < 0 || to < 0 || from == to) return
        order.add(to, order.removeAt(from))
        saveLayoutState()
        applyGridLayout()
    }

    private fun applyGridLayout() {
        grid.removeAllViews()
        val active = order.filter { it in visible && (expanded == null || expanded == it) }
        val count = active.size.coerceAtLeast(1)
        grid.columnCount = when (count) { 1 -> 1; 2 -> 2; 3 -> 3; else -> 2 }
        grid.rowCount = when (count) { 1, 2, 3 -> 1; else -> 2 }
        active.forEach { index ->
            val panel = panels[index] ?: return@forEach
            (panel.root.parent as? ViewGroup)?.removeView(panel.root)
            panel.root.visibility = View.VISIBLE
            panel.root.layoutParams = GridLayout.LayoutParams().apply {
                width = 0
                height = 0
                columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
                rowSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
                setMargins(2, 2, 2, 2)
            }
            grid.addView(panel.root)
        }
    }

    private fun injectLogin(index: Int, webView: WebView) {
        val account = accounts[index]
        if (account.username.isBlank() || account.password.isBlank()) return
        val username = JSONObject.quote(account.username)
        val password = JSONObject.quote(account.password)
        webView.evaluateJavascript("""
            (() => {
              if (location.pathname !== '/login') return false;
              const inputs = [...document.querySelectorAll('input')];
              const user = inputs.find(i => /email|user|login/i.test([i.name,i.id,i.placeholder,i.type].join(' '))) || inputs.find(i => i.type !== 'password');
              const pass = inputs.find(i => i.type === 'password');
              const set = (node, value) => { if (!node) return; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; setter?.call(node, value); node.dispatchEvent(new Event('input', {bubbles:true})); node.dispatchEvent(new Event('change', {bubbles:true})); };
              set(user, $username); set(pass, $password);
              const button = [...document.querySelectorAll('button')].find(b => /login|log in|entrar|iniciar/i.test(b.textContent));
              if (user && pass && button) { setTimeout(() => button.click(), 250); return true; }
              return false;
            })()
        """.trimIndent(), null)
    }

    private fun requestSnapshot(index: Int) {
        val panel = panels[index] ?: return
        panel.webView.evaluateJavascript("window.__idlePokeSnapshot ? window.__idlePokeSnapshot() : '{}' ") { encoded ->
            runCatching {
                val decoded = JSONArray("[$encoded]").getString(0)
                latestSnapshots[index] = JSONObject(decoded)
            }
        }
    }

    private fun onGameEvent(index: Int, kind: String, payload: String) {
        if (kind == "ready") requestSnapshot(index)
        if (kind in setOf("capture", "shiny", "drop")) {
            val signature = "$index:$kind:$payload"
            if (seenEvents.add(signature)) notifier.show(kind, accounts[index].label, payload)
        }
    }

    private fun showSnapshot(index: Int, section: String) {
        requestSnapshot(index)
        grid.postDelayed({
            val snapshot = latestSnapshots[index] ?: JSONObject()
            val value = snapshot.opt(section) ?: JSONObject()
            val formatted = when (value) {
                is JSONObject -> value.toString(2)
                is JSONArray -> value.toString(2)
                else -> value.toString()
            }
            AlertDialog.Builder(this)
                .setTitle("${accounts[index].label} · ${section.replaceFirstChar { it.uppercase() }}")
                .setMessage(if (formatted == "{}" || formatted == "[]") "Todavía no hay datos disponibles en esta sesión." else formatted)
                .setPositiveButton("Cerrar", null)
                .show()
        }, 180)
    }

    private fun showAccountsDialog() {
        val container = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(28, 8, 28, 8) }
        val fields = List(4) { index ->
            val title = TextView(this).apply { text = "CUENTA ${index + 1}"; setTextColor(Color.WHITE) }
            val label = EditText(this).apply { hint = "Nombre"; setTextColor(Color.WHITE); setHintTextColor(Color.GRAY); setText(accounts[index].label) }
            val username = EditText(this).apply { hint = "Usuario o email"; setTextColor(Color.WHITE); setHintTextColor(Color.GRAY); setText(accounts[index].username) }
            val password = EditText(this).apply { hint = "Contraseña"; setTextColor(Color.WHITE); setHintTextColor(Color.GRAY); inputType = 0x81; setText(accounts[index].password) }
            container.addView(title); container.addView(label); container.addView(username); container.addView(password)
            Triple(label, username, password)
        }
        AlertDialog.Builder(this).setTitle("Cuentas cifradas").setView(container)
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Guardar") { _, _ ->
                accounts = fields.mapIndexed { index, row -> Account(row.first.text.toString().ifBlank { "Cuenta ${index + 1}" }, row.second.text.toString(), row.third.text.toString()) }
                accountStore.save(accounts)
                panels.values.forEach { panel -> panel.name.text = accounts[panel.index].label }
                Toast.makeText(this, "Cuentas guardadas. Recarga para iniciar sesión.", Toast.LENGTH_LONG).show()
            }.show()
    }

    private fun showViewModeDialog() {
        val checks = Array(4) { index -> CheckBox(this).apply { text = accounts[index].label; isChecked = index in visible; setTextColor(Color.WHITE) } }
        val container = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(28, 8, 28, 8); checks.forEach(::addView) }
        AlertDialog.Builder(this).setTitle("Ventanas visibles").setView(container)
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Aplicar") { _, _ ->
                val selected = checks.mapIndexedNotNull { index, check -> index.takeIf { check.isChecked } }.toMutableSet()
                if (selected.isEmpty()) selected.add(0)
                visible = selected
                expanded = null
                saveLayoutState()
                applyGridLayout()
            }.show()
    }

    private fun showEventHistory() {
        val content = latestSnapshots.entries.joinToString("\n\n") { (index, snapshot) ->
            "${accounts[index].label}\nCapturas: ${snapshot.optJSONArray("captures")?.length() ?: 0} · Derrotas: ${snapshot.optJSONArray("defeats")?.length() ?: 0} · Drops: ${snapshot.optJSONArray("drops")?.length() ?: 0}"
        }
        AlertDialog.Builder(this).setTitle("Actividad multicuentas").setMessage(content.ifBlank { "Aún no hay actividad registrada." }).setPositiveButton("Cerrar", null).show()
    }

    private fun showFarmCenter() {
        order.filter { it in visible }.forEach(::requestSnapshot)
        AlertDialog.Builder(this).setTitle("Modo Farmeo móvil")
            .setMessage("El recomendador usa los datos WebSocket capturados en cada sesión. Abre el mapa y selecciona la cuenta que deseas controlar. Android mantendrá aisladas las cuatro sesiones mientras la app permanezca en primer plano.")
            .setPositiveButton("Entendido", null).show()
    }

    private fun loadLayoutState() {
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        runCatching {
            val storedOrder = JSONArray(prefs.getString("order", "[0,1,2,3]")).let { array -> MutableList(array.length()) { array.getInt(it) } }
            if (storedOrder.size == 4 && storedOrder.toSet().size == 4) order = storedOrder
            val storedVisible = JSONArray(prefs.getString("visible", "[0,1,2,3]")).let { array ->
                mutableSetOf<Int>().apply { repeat(array.length()) { add(array.getInt(it)) } }
            }
            if (storedVisible.isNotEmpty()) visible = storedVisible
        }
    }

    private fun saveLayoutState() {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("order", JSONArray(order).toString())
            .putString("visible", JSONArray(visible.toList()).toString())
            .apply()
    }

    override fun onDestroy() {
        pollHandler.removeCallbacksAndMessages(null)
        panels.values.forEach {
            it.webView.removeJavascriptInterface("IdlePoke")
            it.webView.stopLoading()
            it.webView.destroy()
        }
        super.onDestroy()
    }
}
