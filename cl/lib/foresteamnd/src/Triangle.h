#pragma once
#include "Vector2.h"
#include "Quaternion.h"

class Triangle {
private:
	float sign(Vector2 p1, Vector2 p2, Vector2 p3);
	Vector verteces[3];
    Vector* base;
    Quaternion rotation;
public:
    Vector _points[3];
	Triangle(Vector a, Vector b, Vector c);
    void CalcVerteces(Vector* base);

    Vector GetPoint(int n);
    Vector* GetPoints();
    void Rotate(Quaternion rotation);

    /// @param point A point on the screen
	bool PlaneContains(Vector2 point);
    /// @returns The normal Vector of the plane
    Vector PlaneNormal();
    /// @param point A point in the world space
    /// @returns Projection of the point onto the plane
    Vector PlanePointProjection(Vector point);
};