-- Staff Scheduling System
-- Bảng quản lý ca làm việc, lịch làm, chấm công

-- Loại ca làm (morning, evening, night)
CREATE TABLE IF NOT EXISTS shift_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,            -- Ca sáng, Ca tối
    start_time TIME NOT NULL,             -- 09:00
    end_time TIME NOT NULL,               -- 17:00
    color VARCHAR(20) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lịch làm việc
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shift_type_id UUID REFERENCES shift_types(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'absent', 'cancelled')),
    note VARCHAR(255),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, work_date, shift_type_id)
);

-- Chấm công
CREATE TABLE IF NOT EXISTS time_clock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    break_minutes INTEGER DEFAULT 0,
    total_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    note VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yêu cầu đổi ca
CREATE TABLE IF NOT EXISTS shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID REFERENCES users(id) ON DELETE CASCADE,           -- Người được yêu cầu đổi
    requester_schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    target_schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reason VARCHAR(255),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default shift types
INSERT INTO shift_types (name, start_time, end_time, color) VALUES
    ('Ca sáng', '09:00', '15:00', '#22C55E'),
    ('Ca chiều', '15:00', '21:00', '#F59E0B'),
    ('Ca tối', '18:00', '23:00', '#8B5CF6')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_date ON schedules(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(work_date);
CREATE INDEX IF NOT EXISTS idx_time_clock_user ON time_clock(user_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_date ON time_clock(clock_in);
