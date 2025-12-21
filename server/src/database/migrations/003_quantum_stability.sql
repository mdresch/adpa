-- Quantum Stability Monitor & Control Layer Database Schema
-- Infrared Trace (750-800nm) - Thermal Conductance for Qubit Stability

-- Quantum Stability Audit Table
CREATE TABLE IF NOT EXISTS quantum_stability_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qubit_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('coherence_lost', 'coherence_restored', 'temperature_critical', 'noise_detected', 'stability_optimized')),
    details TEXT,
    infrared_value DECIMAL(6,2) NOT NULL CHECK (infrared_value >= 750 AND infrared_value <= 800),
    action_taken VARCHAR(200),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Qubit States Table
CREATE TABLE IF NOT EXISTS qubit_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qubit_id VARCHAR(100) UNIQUE NOT NULL,
    state VARCHAR(20) NOT NULL CHECK (state IN ('|0⟩', '|1⟩', '|+⟩', '|-⟩', 'superposition', 'entangled')),
    coherence DECIMAL(5,2) NOT NULL CHECK (coherence >= 0 AND coherence <= 100),
    temperature DECIMAL(10,6) NOT NULL CHECK (temperature >= 0.001 AND temperature <= 1.0),
    noise_level DECIMAL(5,2) NOT NULL CHECK (noise_level >= 0 AND noise_level <= 100),
    stability DECIMAL(5,2) NOT NULL CHECK (stability >= 0 AND stability <= 100),
    infrared_spectrum DECIMAL(6,2) NOT NULL CHECK (infrared_spectrum >= 750 AND infrared_spectrum <= 800),
    last_measurement TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quantum Stability Metrics Table
CREATE TABLE IF NOT EXISTS quantum_stability_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_qubits INTEGER NOT NULL,
    stable_qubits INTEGER NOT NULL,
    decoherence_rate DECIMAL(5,2) NOT NULL CHECK (decoherence_rate >= 0 AND decoherence_rate <= 100),
    average_coherence DECIMAL(5,2) NOT NULL CHECK (average_coherence >= 0 AND average_coherence <= 100),
    thermal_stability DECIMAL(5,2) NOT NULL CHECK (thermal_stability >= 0 AND thermal_stability <= 100),
    noise_reduction DECIMAL(5,2) NOT NULL CHECK (noise_reduction >= 0 AND noise_reduction <= 100),
    efficiency DECIMAL(5,2) NOT NULL CHECK (efficiency >= 0 AND efficiency <= 100),
    infrared_optimization DECIMAL(5,2) NOT NULL CHECK (infrared_optimization >= 0 AND infrared_optimization <= 100),
    speed_of_light_factor DECIMAL(15,2) DEFAULT 299792458,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Infrared Thermal Conductance Log Table
CREATE TABLE IF NOT EXISTS infrared_thermal_conductance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qubit_id VARCHAR(100) NOT NULL,
    infrared_wavelength DECIMAL(6,2) NOT NULL CHECK (infrared_wavelength >= 750 AND infrared_wavelength <= 800),
    thermal_conductance DECIMAL(10,2) NOT NULL,
    cooling_rate DECIMAL(10,6) NOT NULL,
    noise_reduction DECIMAL(5,2) NOT NULL,
    coherence_improvement DECIMAL(5,2) NOT NULL,
    temperature_change DECIMAL(10,6) NOT NULL,
    processing_speed DECIMAL(15,2) DEFAULT 299792458,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quantum_stability_audit_qubit ON quantum_stability_audit(qubit_id);
CREATE INDEX IF NOT EXISTS idx_quantum_stability_audit_event ON quantum_stability_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_quantum_stability_audit_timestamp ON quantum_stability_audit(timestamp);
CREATE INDEX IF NOT EXISTS idx_quantum_stability_audit_infrared ON quantum_stability_audit(infrared_value);

CREATE INDEX IF NOT EXISTS idx_qubit_states_qubit_id ON qubit_states(qubit_id);
CREATE INDEX IF NOT EXISTS idx_qubit_states_coherence ON qubit_states(coherence);
CREATE INDEX IF NOT EXISTS idx_qubit_states_temperature ON qubit_states(temperature);
CREATE INDEX IF NOT EXISTS idx_qubit_states_stability ON qubit_states(stability);
CREATE INDEX IF NOT EXISTS idx_qubit_states_infrared ON qubit_states(infrared_spectrum);

CREATE INDEX IF NOT EXISTS idx_quantum_stability_metrics_timestamp ON quantum_stability_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_quantum_stability_metrics_efficiency ON quantum_stability_metrics(efficiency);

CREATE INDEX IF NOT EXISTS idx_infrared_thermal_conductance_qubit ON infrared_thermal_conductance_log(qubit_id);
CREATE INDEX IF NOT EXISTS idx_infrared_thermal_conductance_wavelength ON infrared_thermal_conductance_log(infrared_wavelength);
CREATE INDEX IF NOT EXISTS idx_infrared_thermal_conductance_timestamp ON infrared_thermal_conductance_log(timestamp);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_qubit_states_updated_at BEFORE UPDATE ON qubit_states FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample qubit states for demonstration
INSERT INTO qubit_states (qubit_id, state, coherence, temperature, noise_level, stability, infrared_spectrum)
VALUES 
    ('qubit-001', 'superposition', 95.5, 0.010, 5.2, 98.1, 775.0),
    ('qubit-002', 'entangled', 92.3, 0.015, 8.1, 95.4, 780.0),
    ('qubit-003', '|+⟩', 88.7, 0.020, 12.3, 90.2, 765.0),
    ('qubit-004', '|0⟩', 97.1, 0.008, 3.5, 99.1, 770.0),
    ('qubit-005', '|-⟩', 91.8, 0.018, 9.7, 93.6, 785.0)
ON CONFLICT (qubit_id) DO NOTHING;

-- Insert initial stability metrics
INSERT INTO quantum_stability_metrics (
    total_qubits, stable_qubits, decoherence_rate, average_coherence, 
    thermal_stability, noise_reduction, efficiency, infrared_optimization
)
VALUES (5, 4, 20.0, 93.08, 95.4, 91.4, 80.0, 96.2);

-- Create view for real-time quantum stability dashboard
CREATE OR REPLACE VIEW quantum_stability_dashboard AS
SELECT 
    qs.qubit_id,
    qs.state,
    qs.coherence,
    qs.temperature,
    qs.noise_level,
    qs.stability,
    qs.infrared_spectrum,
    qs.last_measurement,
    CASE 
        WHEN qs.coherence > 90 AND qs.temperature < 0.015 AND qs.noise_level < 10 THEN 'STABLE'
        WHEN qs.coherence > 80 AND qs.temperature < 0.025 AND qs.noise_level < 20 THEN 'WARNING'
        ELSE 'CRITICAL'
    END as stability_status,
    (qs.coherence * qs.stability * (100 - qs.noise_level)) / 10000 as overall_health_score
FROM qubit_states qs
ORDER BY qs.coherence DESC, qs.stability DESC;

-- Create function to get infrared optimization recommendations
CREATE OR REPLACE FUNCTION get_infrared_optimization(qubit_id_param VARCHAR(100))
RETURNS TABLE (
    current_wavelength DECIMAL(6,2),
    recommended_wavelength DECIMAL(6,2),
    optimization_reason TEXT,
    expected_improvement DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qs.infrared_spectrum as current_wavelength,
        CASE 
            WHEN qs.coherence < 85 THEN 775.0  -- Optimal for coherence
            WHEN qs.temperature > 0.02 THEN 790.0  -- Better cooling
            WHEN qs.noise_level > 15 THEN 760.0  -- Better noise reduction
            ELSE qs.infrared_spectrum  -- Keep current if stable
        END as recommended_wavelength,
        CASE 
            WHEN qs.coherence < 85 THEN 'Optimize for coherence restoration'
            WHEN qs.temperature > 0.02 THEN 'Optimize for thermal cooling'
            WHEN qs.noise_level > 15 THEN 'Optimize for noise reduction'
            ELSE 'Current wavelength is optimal'
        END as optimization_reason,
        CASE 
            WHEN qs.coherence < 85 THEN 15.0  -- Expected coherence improvement
            WHEN qs.temperature > 0.02 THEN 12.0  -- Expected temperature reduction
            WHEN qs.noise_level > 15 THEN 18.0  -- Expected noise reduction
            ELSE 0.0
        END as expected_improvement
    FROM qubit_states qs
    WHERE qs.qubit_id = qubit_id_param;
END;
$$ LANGUAGE plpgsql;
