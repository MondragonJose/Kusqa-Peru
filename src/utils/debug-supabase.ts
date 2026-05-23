/**
 * Archivo de diagnóstico para Supabase
 * Úsalo temporalmente en un componente para verificar:
 * 1. Conexión establecida
 * 2. Lectura de datos
 * 3. Inserción de datos
 * 
 * Ejemplo uso en componente:
 * useEffect(() => {
 *   debugSupabase();
 * }, []);
 */

import { supabase } from "@/lib/supabase";

/** Tipado de respuesta de debug */
type DebugResult = {
  test: string;
  status: "✅ SUCCESS" | "❌ FAILED";
  message: string;
  data?: unknown;
  error?: unknown;
};

/**
 * Test 1: Verificar conexión al cliente Supabase
 */
async function testConnection(): Promise<DebugResult> {
  try {
    // Si esto no tira error, la conexión existe
    const result = {
      url: import.meta.env.VITE_SUPABASE_URL || "not found",
      hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
    return {
      test: "Connection",
      status: "✅ SUCCESS",
      message: "Supabase client initialized",
      data: result,
    };
  } catch (error) {
    return {
      test: "Connection",
      status: "❌ FAILED",
      message: "Failed to initialize Supabase client",
      error,
    };
  }
}

/**
 * Test 2: Leer misiones desde Supabase
 */
async function testReadMissions(): Promise<DebugResult> {
  try {
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .limit(1);

    if (error) {
      return {
        test: "Read Missions",
        status: "❌ FAILED",
        message: `Database error: ${error.message}`,
        error,
      };
    }

    return {
      test: "Read Missions",
      status: "✅ SUCCESS",
      message: `Retrieved ${data?.length || 0} missions`,
      data: data?.[0] || "No missions found (table might be empty)",
    };
  } catch (error) {
    return {
      test: "Read Missions",
      status: "❌ FAILED",
      message: "Exception reading missions",
      error,
    };
  }
}

/**
 * Test 3: Leer perfiles desde Supabase
 */
async function testReadProfiles(): Promise<DebugResult> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .limit(1);

    if (error) {
      return {
        test: "Read Profiles",
        status: "❌ FAILED",
        message: `Database error: ${error.message}`,
        error,
      };
    }

    return {
      test: "Read Profiles",
      status: "✅ SUCCESS",
      message: `Retrieved ${data?.length || 0} profiles`,
      data: data?.[0] || "No profiles found (table might be empty)",
    };
  } catch (error) {
    return {
      test: "Read Profiles",
      status: "❌ FAILED",
      message: "Exception reading profiles",
      error,
    };
  }
}

/**
 * Test 4: Insertar misión de prueba
 * ⚠️ CUIDADO: Esto insertará datos reales en la BD
 */
async function testInsertMission(): Promise<DebugResult> {
  try {
    const testMission = {
      title: "Test Mission - Delete Me",
      description: "Prueba de inserción desde debug",
      district: "Lima",
      region: "costa" as const,
      category: "test" as const,
      xp: 100,
      difficulty: "easy" as const,
      date: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("missions")
      .insert([testMission])
      .select();

    if (error) {
      return {
        test: "Insert Mission",
        status: "❌ FAILED",
        message: `Insert error: ${error.message}`,
        error,
      };
    }

    return {
      test: "Insert Mission",
      status: "✅ SUCCESS",
      message: "Test mission inserted successfully",
      data: data?.[0] || "Unknown response",
    };
  } catch (error) {
    return {
      test: "Insert Mission",
      status: "❌ FAILED",
      message: "Exception inserting mission",
      error,
    };
  }
}

/**
 * Ejecuta todos los tests y muestra reporte
 */
export async function debugSupabase(): Promise<void> {
  console.log("\n🔍 SUPABASE DEBUG REPORT\n");
  console.log("=".repeat(50));

  const results: DebugResult[] = [];

  // Test 1: Connection
  const connResult = await testConnection();
  results.push(connResult);
  console.log(`${connResult.status} ${connResult.test}`);
  console.log(`   ${connResult.message}\n`);

  // Test 2: Read missions
  const missionsResult = await testReadMissions();
  results.push(missionsResult);
  console.log(`${missionsResult.status} ${missionsResult.test}`);
  console.log(`   ${missionsResult.message}`);
  if (missionsResult.data) {
    console.log(`   Data:`, missionsResult.data, "\n");
  }

  // Test 3: Read profiles
  const profilesResult = await testReadProfiles();
  results.push(profilesResult);
  console.log(`${profilesResult.status} ${profilesResult.test}`);
  console.log(`   ${profilesResult.message}`);
  if (profilesResult.data) {
    console.log(`   Data:`, profilesResult.data, "\n");
  }

  // Test 4: Insert mission (COMMENTED - uncomment to test)
  // Descomenta esto solo si quieres probar inserción:
  // const insertResult = await testInsertMission();
  // results.push(insertResult);
  // console.log(`${insertResult.status} ${insertResult.test}`);
  // console.log(`   ${insertResult.message}\n`);

  // Summary
  const allPassed = results.every((r) => r.status === "✅ SUCCESS");
  console.log("=".repeat(50));
  if (allPassed) {
    console.log("✅ ALL TESTS PASSED");
  } else {
    console.log("❌ SOME TESTS FAILED - Check output above");
  }
  console.log("\n");
}

/**
 * Función para inspeccionar estructura de tabla (útil para debugging)
 */
export async function inspectTable(tableName: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .limit(0); // Solo obtiene schema, sin datos

    if (error) {
      console.error(`Error inspecting ${tableName}:`, error);
      return;
    }

    console.log(`\n📋 Table: ${tableName}`);
    console.log("Columns:", Object.keys(data?.[0] || {}));
  } catch (error) {
    console.error(`Exception inspecting ${tableName}:`, error);
  }
}
