package online.idleworld.idlepokelauncher.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureAccountStore(context: Context) {
    private val preferences = context.getSharedPreferences("secure_accounts", Context.MODE_PRIVATE)
    private val alias = "idle_poke_accounts_v1"

    fun load(): List<Account> = runCatching {
        val payload = preferences.getString("payload", null) ?: return@runCatching emptyList()
        val wrapper = JSONObject(payload)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(wrapper.getString("iv"), Base64.NO_WRAP)))
        val json = String(cipher.doFinal(Base64.decode(wrapper.getString("data"), Base64.NO_WRAP)), Charsets.UTF_8)
        val array = JSONArray(json)
        List(4) { index ->
            val row = array.optJSONObject(index) ?: JSONObject()
            Account(row.optString("label"), row.optString("username"), row.optString("password"))
        }
    }.getOrElse { emptyList() }.let { rows ->
        List(4) { index -> rows.getOrNull(index) ?: Account(label = "Cuenta ${index + 1}") }
    }

    fun save(accounts: List<Account>) {
        val array = JSONArray()
        accounts.take(4).forEach { account ->
            array.put(JSONObject().put("label", account.label).put("username", account.username).put("password", account.password))
        }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val encrypted = cipher.doFinal(array.toString().toByteArray(Charsets.UTF_8))
        val wrapper = JSONObject()
            .put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .put("data", Base64.encodeToString(encrypted, Base64.NO_WRAP))
        preferences.edit().putString("payload", wrapper.toString()).apply()
    }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build())
            generateKey()
        }
    }
}
