package online.idleworld.idlepokelauncher.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import online.idleworld.idlepokelauncher.R

class NotificationHelper(private val context: Context) {
    private val manager = context.getSystemService(NotificationManager::class.java)

    init {
        listOf(
            Triple("capture", "Capturas y metas", NotificationManager.IMPORTANCE_HIGH),
            Triple("shiny", "Pokémon shiny", NotificationManager.IMPORTANCE_HIGH),
            Triple("drop", "Drops", NotificationManager.IMPORTANCE_DEFAULT)
        ).forEach { (id, name, importance) -> manager.createNotificationChannel(NotificationChannel(id, name, importance)) }
    }

    fun show(channel: String, title: String, body: String) {
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        manager.notify((System.nanoTime() and 0x7fffffff).toInt(), NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_launcher_pokeball)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .build())
    }
}
