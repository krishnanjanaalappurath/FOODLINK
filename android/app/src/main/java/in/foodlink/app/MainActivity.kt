package in.foodlink.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {
    private lateinit var auth: FirebaseAuth
    private val fused by lazy { LocationServices.getFusedLocationProviderClient(this) }
    private lateinit var status: TextView
    private lateinit var phone: EditText
    private lateinit var otp: EditText
    private var verificationId: String? = null

    private val locationPermission = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        if (grants[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true) showLocation()
        else status.text = "Location permission was not granted."
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        FirebaseApp.initializeApp(this)
        auth = FirebaseAuth.getInstance()
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 50, 40, 30)
        }
        layout.addView(TextView(this).apply { text = "🥗 FOODLINK"; textSize = 28f })
        layout.addView(TextView(this).apply { text = "Rescue food. Share hope."; textSize = 15f })
        phone = EditText(this).apply { hint = "Phone number e.g. +919876543210" }
        layout.addView(phone)
        val send = Button(this).apply { text = "Send OTP" }
        layout.addView(send)
        otp = EditText(this).apply { hint = "Enter OTP"; inputType = 2 }
        layout.addView(otp)
        val verify = Button(this).apply { text = "Verify OTP" }
        layout.addView(verify)
        val gps = Button(this).apply { text = "Use my current location" }
        layout.addView(gps)
        status = TextView(this).apply { text = "Sign in to FOODLINK"; textSize = 14f }
        layout.addView(status)
        setContentView(ScrollView(this).apply { addView(layout) })

        send.setOnClickListener { sendOtp() }
        verify.setOnClickListener { verifyOtp() }
        gps.setOnClickListener { requestLocation() }
    }

    private fun sendOtp() {
        val number = phone.text.toString().trim()
        if (!number.startsWith("+") || number.length < 10) {
            status.text = "Enter a valid phone number with country code."
            return
        }
        val options = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(number)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(this)
            .setCallbacks(object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                override fun onVerificationCompleted(credential: com.google.firebase.auth.PhoneAuthCredential) {
                    auth.signInWithCredential(credential).addOnSuccessListener {
                        status.text = "Phone verified and signed in."
                    }
                }
                override fun onVerificationFailed(e: com.google.firebase.FirebaseException) {
                    status.text = "OTP failed: ${e.localizedMessage}"
                }
                override fun onCodeSent(id: String, token: PhoneAuthProvider.ForceResendingToken) {
                    verificationId = id
                    status.text = "OTP sent. Enter the code received."
                }
            }).build()
        PhoneAuthProvider.verifyPhoneNumber(options)
    }

    private fun verifyOtp() {
        val id = verificationId
        if (id == null) { status.text = "Request an OTP first."; return }
        val credential = PhoneAuthProvider.getCredential(id, otp.text.toString().trim())
        auth.signInWithCredential(credential).addOnSuccessListener {
            status.text = "Phone verified. Profile and role approval are the next setup steps."
        }.addOnFailureListener { status.text = "Verification failed: ${it.localizedMessage}" }
    }

    private fun requestLocation() {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (fine != PackageManager.PERMISSION_GRANTED && coarse != PackageManager.PERMISSION_GRANTED) {
            locationPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        } else showLocation()
    }

    private fun showLocation() {
        try {
            fused.lastLocation.addOnSuccessListener { loc ->
                status.text = if (loc != null) "Current location: ${loc.latitude}, ${loc.longitude}"
                else "Location not available yet. Enable device location and try again."
            }.addOnFailureListener { status.text = "Could not get location: ${it.localizedMessage}" }
        } catch (e: SecurityException) { status.text = "Location permission is required." }
    }
}
